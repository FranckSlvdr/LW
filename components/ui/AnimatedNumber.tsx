'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  /** Animation duration in ms */
  duration?: number
  /** How to format the number for display */
  format?: (n: number) => string
  className?: string
}

/**
 * Animates a number from its previous value to the new value using
 * requestAnimationFrame with an ease-out-cubic curve.
 */
export function AnimatedNumber({
  value,
  duration = 900,
  format = String,
  className = '',
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(value)
  const prevRef   = useRef(value)
  const rafRef    = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to   = value
    if (from === to) return

    let startTime: number | null = null

    const animate = (now: number) => {
      if (startTime === null) startTime = now
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(from + (to - from) * eased))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevRef.current = to
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return <span className={className}>{format(displayed)}</span>
}
