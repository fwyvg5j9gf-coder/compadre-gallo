'use client'

import { useEffect, useRef } from 'react'

const HEART_PATTERN = [
  '  ##  ##  ',
  ' ######## ',
  '##########',
  '##########',
  ' ######## ',
  '  ######  ',
  '   ####   ',
  '    ##    ',
]

function parseHeart(): { x: number; y: number }[] {
  const pixels: { x: number; y: number }[] = []
  HEART_PATTERN.forEach((line, y) => {
    line.split('').forEach((ch, x) => {
      if (ch === '#') pixels.push({ x, y })
    })
  })
  return pixels
}

const HEART_PIXELS = parseHeart()
const GRID_W = Math.max(...HEART_PIXELS.map(p => p.x)) + 1
const GRID_H = Math.max(...HEART_PIXELS.map(p => p.y)) + 1

type Balloon = {
  id: number
  x: number
  y: number
  vy: number
  vx: number
  phase: number
  phaseSpeed: number
  size: number
  opacity: number
  fadeIn: boolean
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
      const size = 4 + Math.floor(Math.random() * 9)
      const x = size * GRID_W + Math.random() * (canvas.width - size * GRID_W * 2)
      const y = canvas.height + size * GRID_H
      balloonsRef.current.push({
        id: nextId.current++,
        x,
        y,
        vy: -(0.5 + Math.random() * 1.2),
        vx: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.015 + Math.random() * 0.02,
        size,
        opacity: 0,
        fadeIn: true,
        alive: true,
      })
    }

    function drawHeart(ctx: CanvasRenderingContext2D, b: Balloon) {
      ctx.save()
      ctx.globalAlpha = b.opacity
      const sway = Math.sin(b.phase) * (b.size * 1.2)
      ctx.translate(b.x + sway, b.y)
      ctx.fillStyle = '#ff0100'
      HEART_PIXELS.forEach(({ x, y }) => {
        ctx.fillRect(
          -(GRID_W * b.size) / 2 + x * b.size,
          -(GRID_H * b.size) / 2 + y * b.size,
          b.size - 1,
          b.size - 1
        )
      })
      ctx.restore()
    }

    let spawnTimer = 0

    function loop() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      spawnTimer++
      const spawnRate = Math.max(8, 20 - Math.floor(balloonsRef.current.length / 8))
      if (spawnTimer >= spawnRate) {
        spawnBalloon()
        spawnTimer = 0
      }

      balloonsRef.current = balloonsRef.current.filter(b => b.alive)
      balloonsRef.current.forEach(b => {
        b.phase += b.phaseSpeed
        b.y += b.vy
        b.x += b.vx
        if (b.fadeIn) {
          b.opacity = Math.min(0.85, b.opacity + 0.025)
          if (b.opacity >= 0.85) b.fadeIn = false
        }
        if (b.y < -GRID_H * b.size * 2) b.alive = false
        drawHeart(ctx, b)
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
        animation: 'entrar 1.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        background: 'rgba(255,255,255,0.7)',
        padding: '24px 40px',
        borderRadius: 4,
      }}>
        <p style={{
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: 'clamp(40px, 10vw, 100px)',
          fontWeight: 900,
          color: '#0a0a0a',
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>
          te amo vavi
        </p>
      </div>

      <style>{`
        @keyframes entrar {
          from {
            opacity: 0;
            transform: translateY(20px);
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
