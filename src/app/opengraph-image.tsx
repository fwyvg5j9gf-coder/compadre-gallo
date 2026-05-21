import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GALLO'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const fontData = await fetch(
    'https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g7M8btVsD8CmdrLu0-K6z9mXg.woff2'
  ).then(r => r.arrayBuffer())

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
