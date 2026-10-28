#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PROFILE="$(mktemp -d "$DIR/.chrome-render.XXXXXX")"
trap 'rm -rf "$PROFILE"' EXIT
chrome_ok=true
for lampara in pitaya chicle; do
  for version in feed-noche feed-dia story-noche; do
    formato="${version%-*}"
    variante="${version#*-}"
    alto=1350
    if [[ "$formato" == story ]]; then alto=1920; fi
    if ! "$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 \
      --no-first-run --no-default-browser-check --disable-background-networking \
      --user-data-dir="$PROFILE" --allow-file-access-from-files \
      --run-all-compositor-stages-before-draw --virtual-time-budget=2000 \
      --window-size="1080,$alto" --screenshot="$DIR/$lampara-$version.png" \
      "file://$DIR/anuncio.html?lampara=$lampara&formato=$formato&variante=$variante"; then
      chrome_ok=false
      break 2
    fi
  done
done

if [[ "$chrome_ok" == false ]]; then
  python3 - "$DIR" <<'PYTHON'
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
root=Path(sys.argv[1]); src=root/'src'
font=src/'NewakeFont-Demo.otf'
sans='/System/Library/Fonts/Helvetica.ttc'
bold='/System/Library/Fonts/Helvetica.ttc'
def ft(size, heavy=False):
    return ImageFont.truetype(bold if heavy else sans,size,index=1 if heavy else 0)
def text_at(im,xy,text,font,color):
    ImageDraw.Draw(im).text(xy,text,font=font,fill=color,anchor='lt')
def headline(im,text,y,size,color,scale):
    f=ImageFont.truetype(str(font),size)
    layer=Image.new('RGBA',(1700,240))
    # Newake's ascender starts 0.0667em below the CSS line box.
    x=0
    for word in text.split():
        ImageDraw.Draw(layer).text((x,0),word,font=f,fill=color)
        x+=f.getlength(word)+size*.3
    layer=layer.resize((round(1700*scale),240),Image.Resampling.LANCZOS)
    im.alpha_composite(layer,(72,y))
def wrap(text,font,width):
    rows=[]; row=''
    for word in text.split():
        trial=(row+' '+word).strip()
        if font.getlength(trial)>width and row: rows.append(row);row=word
        else: row=trial
    return rows+[row]
for lamp in ('pitaya','chicle'):
 for version in ('feed-noche','feed-dia','story-noche'):
    day=version.endswith('dia'); story=version.startswith('story'); h=1920 if story else 1350
    bg=(206,203,198) if day else (19,17,15)
    im=Image.new('RGBA',(1080,h),bg+(255,))
    name='chicle-e26' if lamp=='chicle' else lamp
    render=Image.open(src/f"{name}-{'dia' if day else 'noche'}.png").convert('RGBA')
    w,ih,x,y=(900,990,90,-45) if day else ((1180,1298,-50,328) if story else (1040,1144,20,75))
    render=render.resize((w,ih),Image.Resampling.LANCZOS)
    # Fade only the original render's outer edges; the object is untouched.
    mx=Image.new('L',(w,1)); mx.putdata([round(255*min(1,i/(w*.08),(w-1-i)/(w*.08))) for i in range(w)])
    my=Image.new('L',(1,ih)); my.putdata([round(255*min(1,i/(ih*.06),(ih-1-i)/(ih*.15))) for i in range(ih)])
    render.putalpha(ImageChops.multiply(mx.resize((w,ih)),my.resize((w,ih))))
    im.alpha_composite(render,(x,y))
    if day: ImageDraw.Draw(im).rectangle((0,918,1080,h),fill='#00c4df' if lamp=='pitaya' else '#003a87')
    title='prende la pitaya' if lamp=='pitaya' else 'masca luz'
    color=('#003a87' if day else '#ffd49a') if lamp=='pitaya' else '#ffe200'
    headline(im,title,942 if day else (266 if story else 64),190 if story else 150,color,(.59 if story else .748) if lamp=='pitaya' else (.94 if story else 1))
    subtitle='un globo de vinil con cinco picos que suben girando. impresa en 3d y pintada a mano en cdmx.' if lamp=='pitaya' else 'una gota de cuatro gajos gordos que se tuerce al subir. impresa en 3d y pintada a mano en cdmx.'
    size=34 if day else 36; sy=1114 if day else (1440 if story else 1082)
    fg='#003a87' if day and lamp=='pitaya' else ('#ffffff' if day else '#dcdcdc')
    for i,row in enumerate(wrap(subtitle,ft(size),936)): text_at(im,(72,sy+i*size*1.22),row,ft(size),fg)
    fy=1558 if story else 1222
    logo=Image.open(src/f"rooster-{'black' if day and lamp=='pitaya' else 'white'}-on-transparent.png").convert('RGBA')
    logo=logo.resize((round(logo.width*56/logo.height),56),Image.Resampling.LANCZOS)
    im.alpha_composite(logo,(72,fy))
    text_at(im,(72+logo.width+18,fy+14),'compadregallo.com/tienda',ft(28),'#003a87' if day and lamp=='pitaya' else '#ffffff')
    label='EN EL TALLER'; f=ft(24,True); spacing=24*.06
    labelw=sum(f.getlength(c) for c in label)+(len(label)-1)*spacing
    cw=round(labelw+48); cx=72 if day else 1008-cw; cy=72 if day else fy-2
    ImageDraw.Draw(im).rounded_rectangle((cx,cy,cx+cw,cy+60),radius=30,fill='#ffe200')
    tx=cx+24
    for c in label:
        text_at(im,(tx,cy+18),c,f,'#000000');tx+=f.getlength(c)+spacing
    im.convert('RGB').save(root/f'{lamp}-{version}.png')
    print(f'{lamp}-{version}.png: 1080x{h} (Pillow)')
PYTHON
fi
