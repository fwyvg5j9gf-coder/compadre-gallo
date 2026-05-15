'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

export async function cropAndCompress(src: string, pixelCrop: Area, originalName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 1200
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y,
        pixelCrop.width, pixelCrop.height,
        0, 0,
        1200, 1200,
      )
      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('error al procesar imagen')); return }
          resolve(new File([blob], originalName.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))
        },
        'image/webp',
        0.82,
      )
    }
    image.onerror = () => reject(new Error('imagen inválida'))
    image.src = src
  })
}

export default function ImageCropper({
  src,
  onConfirm,
  onCancel,
}: {
  src: string
  onConfirm: (pixels: Area) => void
  onCancel: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedPixels(pixels)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.88)',
      zIndex: 200,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 20 }}>
        ajusta el recorte
      </div>

      {/* Área del cropper */}
      <div style={{
        position: 'relative',
        width: 'min(480px, 90vw)',
        height: 'min(480px, 90vw)',
        borderRadius: 4,
        overflow: 'hidden',
        background: '#0a0a0a',
      }}>
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={false}
          style={{
            containerStyle: { background: '#111' },
            cropAreaStyle: {
              border: '2px solid #ff0100',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            },
          }}
        />
      </div>

      {/* Zoom */}
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18, color: '#6b6a64', lineHeight: 1 }}>−</span>
        <input
          type="range"
          min={1} max={3} step={0.01}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          style={{ width: 200, accentColor: '#ff0100', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 18, color: '#6b6a64', lineHeight: 1 }}>+</span>
      </div>

      <p style={{ color: '#6b6a64', fontSize: 12, marginTop: 10 }}>
        arrastra para reposicionar · zoom con la rueda del mouse o el slider
      </p>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent', color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 4, padding: '10px 24px',
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          cancelar
        </button>
        <button
          type="button"
          onClick={() => croppedPixels && onConfirm(croppedPixels)}
          disabled={!croppedPixels}
          style={{
            background: '#ff0100', color: '#fff', border: 'none',
            borderRadius: 4, padding: '10px 24px',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          confirmar recorte
        </button>
      </div>
    </div>
  )
}
