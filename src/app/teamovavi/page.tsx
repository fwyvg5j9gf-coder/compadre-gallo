'use client'

import { useEffect, useRef } from 'react'

const HEART = `
  ##  ##
 ######
########
########
 ######
  ####
   ##
`.trim()

function parseHeart(): { x: number; y: number }[] {
  const pixels: { x: number; y: number }[] = []
  const lines = HEART.split('\n')
  lines.forEach((line, y) => {
    line.split('').forEach((ch, x) => {
      if (ch === '#') pixels.push({ x, y })
    })
  })
  return pixels
}

const HEART_PIXELS = parseHeart()
const GRID_W = Math.max(...HEART_PIXELS.map(p => p.x)) + 1
const GRID_H = Math.max(...HEART_PIXELS.map(p => p.y)) + 1
const PIXEL = 10

type Balloon = {
  id: number
  x: number
  y: number
  vy: number
  vx: number
  phase: number
  scale: number
  opacity: number
  alive: boolean
}

export default function TeAmoVaviPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const balloonsRef = useRef<Balloon[]>([])
  const nextId = useRef(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function spawnBalloon() {
      if (!canvas) return
      const px = HEART_PIXELS[Math.floor(Math.random() * HEART_PIXELS.length)]
      const centerX = canvas.width / 2 - (GRID_W * PIXEL) / 2
      const centerY = canvas.height * 0.55 - (GRID_H * PIXEL) / 2
      const x = centerX + px.x * PIXEL + PIXEL / 2
      const y = centerY + px.y * PIXEL + PIXEL / 2

      balloonsRef.current.push({
        id: nextId.current++,
        x,
        y,
        vy: -(0.6 + Math.random() * 0.9),
        vx: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
        scale: 0.6 + Math.random() * 0.7,
        opacity: 0,
        alive: true,
      })
    }

    function drawPixelHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
      const startX = cx - (GRID_W * PIXEL) / 2
      const startY = cy - (GRID_H * PIXEL) / 2
      ctx.fillStyle = '#ff0100'
      HEART_PIXELS.forEach(({ x, y }) => {
        ctx.fillRect(startX + x * PIXEL, startY + y * PIXEL, PIXEL - 1, PIXEL - 1)
      })
    }

    function drawBalloonHeart(ctx: CanvasRenderingContext2D, b: Balloon) {
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.scale(b.scale, b.scale)
      ctx.globalAlpha = b.opacity

      const sway = Math.sin(b.phase) * 2
      ctx.translate(sway, 0)

      const size = PIXEL
      ctx.fillStyle = '#ff0100'
      HEART_PIXELS.forEach(({ x, y }) => {
        ctx.fillRect(
          -(GRID_W * size) / 2 + x * size,
          -(GRID_H * size) / 2 + y * size,
          size - 1,
          size - 1
        )
      })

      ctx.restore()
    }

    let spawnTimer = 0
    let t = 0

    function loop() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      t++
      spawnTimer++
      if (spawnTimer >= 18) {
        spawnBalloon()
        spawnTimer = 0
      }

      // Draw static heart in center-bottom
      const cx = canvas.width / 2
      const cy = canvas.height * 0.55
      drawPixelHeart(ctx, cx, cy)

      // Update and draw balloons
      balloonsRef.current = balloonsRef.current.filter(b => b.alive)
      balloonsRef.current.forEach(b => {
        b.phase += 0.03
        b.y += b.vy
        b.x += b.vx
        if (b.opacity < 1) b.opacity = Math.min(1, b.opacity + 0.04)
        if (b.y < -100) b.alive = false

        drawBalloonHeart(ctx, b)
      })

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div style={{
      background: '#fff',
      minHeight: '100vh',
      width: '100%',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
      />

      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        animation: 'entrar 1.2s cubic-bezier(0.22, 1, 0.36, 1) both',
      }}>
        <p style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(48px, 12vw, 120px)',
          fontWeight: 900,
          color: '#0a0a0a',
          margin: 0,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          userSelect: 'none',
        }}>
          te amo vavi
        </p>
      </div>

      <style>{`
        @keyframes entrar {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
