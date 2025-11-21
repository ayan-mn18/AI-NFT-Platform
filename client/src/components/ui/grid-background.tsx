import { useEffect, useRef } from 'react'

export function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    window.addEventListener('resize', resize)
    resize()

    const gridSize = 60
    const speed = 4 // Increased speed
    const particleCount = 2 // Only 2 particles

    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      baseVx: number
      color: string
      delay: number
      distanceTraveled: number
    }

    const particles: Particle[] = []
    const colors = ['#9333ea', '#4f46e5', '#ec4899'] // Purple, Indigo, Pink

    const createParticle = (index: number, reset = false): Particle => {
      // Center band: Middle 40%
      const totalRows = Math.floor(height / gridSize)
      const bandHeightRows = Math.floor(totalRows * 0.4)
      const startRow = Math.floor((totalRows - bandHeightRows) / 2)

      const row = startRow + Math.floor(Math.random() * bandHeightRows)

      // Width limits: Center 60%
      const gridWidth = width * 0.6
      const startX = (width - gridWidth) / 2
      const endX = startX + gridWidth

      // Index 0: Left to Right (1)
      // Index 1: Right to Left (-1)
      const dir = index % 2 === 0 ? 1 : -1
      const velocity = speed * dir

      return {
        x: reset
          ? (dir === 1 ? startX - gridSize : endX + gridSize)
          : startX + Math.random() * gridWidth,
        y: row * gridSize,
        vx: velocity,
        vy: 0,
        baseVx: velocity,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: reset ? 0 : Math.random() * 100,
        distanceTraveled: 0
      }
    }

    // Initialize
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(i))
    }

    const draw = () => {
      // Clear with transparency for trail effect? No, clean clear for this style
      ctx.clearRect(0, 0, width, height)

      const gridWidth = width * 0.6
      const startX = (width - gridWidth) / 2
      const endX = startX + gridWidth

      // Draw Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.lineWidth = 1

      // Vertical lines
      const firstLineX = Math.ceil(startX / gridSize) * gridSize
      for (let x = firstLineX; x <= endX; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      // Horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(startX, y)
        ctx.lineTo(endX, y)
        ctx.stroke()
      }

      // Update and Draw Particles
      particles.forEach((p, index) => {
        if (p.delay > 0) {
          p.delay--
          return
        }

        // Move
        p.x += p.vx
        p.y += p.vy
        p.distanceTraveled += speed

        // Draw Trail
        const trailLength = 25
        const gradient = ctx.createLinearGradient(
          p.x - (p.vx * trailLength), p.y - (p.vy * trailLength),
          p.x, p.y
        )
        gradient.addColorStop(0, 'transparent')
        gradient.addColorStop(1, p.color)

        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath()
        // Simple trail drawing (straight line opposite to velocity)
        // This works well because we only turn at grid points
        ctx.moveTo(p.x - (p.vx * trailLength), p.y - (p.vy * trailLength))
        ctx.lineTo(p.x, p.y)
        ctx.stroke()

        // Glow head
        ctx.shadowBlur = 10
        ctx.shadowColor = p.color
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Turn Logic
        // Check if we are near a grid intersection
        // We use a small threshold because floating point math
        const xMod = p.x % gridSize
        const yMod = p.y % gridSize
        const atIntersection = (xMod < speed && xMod > -speed) && (yMod < speed && yMod > -speed)

        if (atIntersection) {
          // Snap to grid exactly to prevent drift
          // But only snap the coordinate perpendicular to movement to avoid stutter?
          // Actually, let's just snap both when turning

          if (Math.random() < 0.2) { // 20% chance to turn
            // Snap
            p.x = Math.round(p.x / gridSize) * gridSize
            p.y = Math.round(p.y / gridSize) * gridSize

            if (p.vx !== 0) {
              // Moving horizontally -> Turn Vertical
              p.vx = 0
              p.vy = Math.random() > 0.5 ? speed : -speed
            } else {
              // Moving vertically -> Turn Horizontal (Resume base direction)
              p.vy = 0
              p.vx = p.baseVx
            }
          }
        }

        // Reset if out of bounds or out of the 40% zone
        const totalRows = Math.floor(height / gridSize)
        const bandHeightRows = Math.floor(totalRows * 0.4)
        const startRow = Math.floor((totalRows - bandHeightRows) / 2)
        const endRow = startRow + bandHeightRows

        const minY = (startRow - 2) * gridSize
        const maxY = (endRow + 2) * gridSize

        const isOutOfBounds =
          (p.baseVx > 0 && p.x > endX + 50) ||
          (p.baseVx < 0 && p.x < startX - 50) ||
          (p.y < minY) ||
          (p.y > maxY)

        if (isOutOfBounds) {
          Object.assign(p, createParticle(index, true))
        }
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-60 hidden lg:block" />
}
