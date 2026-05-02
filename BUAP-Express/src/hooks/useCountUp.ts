import { useEffect, useState, useRef } from 'react'

export function useCountUp(target: number, duration = 600) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    startTime.current = null
    setCount(0)
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setCount(Math.round(eased * target))
      if (progress < 1) rafId.current = requestAnimationFrame(animate)
    }
    rafId.current = requestAnimationFrame(animate)
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [target, duration])

  return count
}
