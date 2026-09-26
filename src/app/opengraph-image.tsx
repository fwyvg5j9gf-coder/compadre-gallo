import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GALLO'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // Satori (lo que dibuja esta imagen) no lee woff2: con el .woff2 de antes
  // tronaba con "Unsupported OpenType signature wOF2" y las previews en redes
  // salían sin imagen. Google Fonts manda TTF si no se le pide como
  // navegador; `text=gallo` recorta la fuente a esas letras.
  const css = await fetch('https://fonts.googleapis.com/css2?family=DM+Sans:wght@900&text=gallo').then(r => r.text())
  const ttf = css.match(/src: url\((https:[^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1]
  if (!ttf) throw new Error('Google Fonts no devolvió DM Sans en TTF')
  const fontData = await fetch(ttf).then(r => r.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'DM Sans',
            fontWeight: 900,
            fontSize: 280,
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}
        >
          <span style={{ color: '#003a87' }}>g</span>
          <span style={{ color: '#00c4df' }}>a</span>
          <span style={{ color: '#ffd49a' }}>l</span>
          <span style={{ color: '#ff0100' }}>l</span>
          <span style={{ color: '#ffe200' }}>o</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'DM Sans', data: fontData, style: 'normal', weight: 900 }],
    }
  )
}
