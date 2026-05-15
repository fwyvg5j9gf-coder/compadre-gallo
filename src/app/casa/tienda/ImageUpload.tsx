'use client'

import { useState, useRef, DragEvent } from 'react'
import type { Area } from 'react-easy-crop'
import { getUploadUrl } from './actions'
import ImageCropper, { cropAndCompress } from './ImageCropper'

type Phase = 'idle' | 'cropping' | 'uploading' | 'done'

export default function ImageUpload({
  currentUrl,
  onUploaded,
}: {
  currentUrl?: string | null
  onUploaded: (url: string) => void
}) {
  const [phase, setPhase] = useState<Phase>(currentUrl ? 'done' : 'idle')
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function openFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('solo imágenes JPG, PNG o WebP')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('la imagen no puede pesar más de 10MB')
      return
    }
    setError(null)
    setPendingFile(file)
    setCropSrc(URL.createObjectURL(file))
    setPhase('cropping')
  }

  async function handleCropConfirm(pixels: Area) {
    if (!cropSrc || !pendingFile) return
    setPhase('uploading')
    setProgress(0)

    try {
      const croppedFile = await cropAndCompress(cropSrc, pixels, pendingFile.name)

      // Preview local con el resultado cuadrado
      const localPreview = URL.createObjectURL(croppedFile)
      setPreview(localPreview)

      const { signedUrl, publicUrl } = await getUploadUrl(croppedFile.name, croppedFile.type)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        })
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`error ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('error de red'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', croppedFile.type)
        xhr.send(croppedFile)
      })

      URL.revokeObjectURL(cropSrc)
      onUploaded(publicUrl)
      setPhase('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'error al subir')
      setPhase(preview ? 'done' : 'idle')
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setPendingFile(null)
    setPhase(preview ? 'done' : 'idle')
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) openFile(file)
  }

  const clickable = phase === 'idle' || phase === 'done'

  return (
    <>
      {/* Modal de recorte */}
      {phase === 'cropping' && cropSrc && (
        <ImageCropper
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6a64', marginBottom: 8, letterSpacing: '0.03em' }}>
          imagen del producto
        </div>

        <div
          onClick={() => clickable && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (clickable) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            maxWidth: 300,
            border: `2px dashed ${dragging ? '#ff0100' : '#d4d3cd'}`,
            borderRadius: 8,
            background: dragging ? '#fff5f5' : preview ? '#0a0a0a' : '#f6f5f1',
            cursor: clickable ? 'pointer' : 'default',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          {/* Preview */}
          {preview && (
            <img
              src={preview}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {/* Placeholder vacío */}
          {phase === 'idle' && (
            <div style={{ textAlign: 'center', pointerEvents: 'none', padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.25, fontWeight: 900 }}>1:1</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6b6a64' }}>
                arrastra o haz clic
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                JPG · PNG · WebP · máx 10MB
              </div>
            </div>
          )}

          {/* Progreso de upload */}
          {phase === 'uploading' && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(10,10,10,0.65)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                subiendo {progress}%
              </div>
              <div style={{ width: 120, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                <div style={{
                  height: '100%', background: '#ff0100', borderRadius: 2,
                  width: `${progress}%`, transition: 'width 0.1s',
                }} />
              </div>
            </div>
          )}

          {/* Botón cambiar */}
          {phase === 'done' && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
              style={{
                position: 'absolute', bottom: 8, right: 8,
                background: 'rgba(10,10,10,0.75)', color: '#fff',
                border: 'none', borderRadius: 4,
                padding: '5px 12px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              cambiar
            </button>
          )}
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#ff0100', marginTop: 6 }}>{error}</div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) openFile(file)
            e.target.value = ''
          }}
        />
      </div>
    </>
  )
}
