"use client"

import { useEffect, useState } from "react"

interface Props {
  startedAt: number | null
  durationSeconds: number
  onExpired: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60)
    .toString()
    .padStart(2, "0")
  const s = Math.floor(Math.abs(seconds) % 60)
    .toString()
    .padStart(2, "0")
  return `${m}:${s}`
}

export default function InterviewTimer({ startedAt, durationSeconds, onExpired }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return

    const interval = setInterval(() => {
      const e = Math.floor((Date.now() - startedAt) / 1000)
      setElapsed(e)
      if (e >= durationSeconds) {
        clearInterval(interval)
        onExpired()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, durationSeconds, onExpired])

  const remaining = durationSeconds - elapsed
  const isOvertime = remaining < 0

  return (
    <span className={isOvertime ? "text-destructive tabular-nums" : "tabular-nums"}>
      {formatTime(remaining)}
    </span>
  )
}
