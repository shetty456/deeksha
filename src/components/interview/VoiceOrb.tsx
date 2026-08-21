"use client"

import { useEffect, useRef } from "react"
import type { AudioState } from "@/lib/voice/types"
import { cn } from "@/lib/utils"

interface Props {
  state: AudioState
  amplitude?: number
}

const STATE_COLORS: Record<AudioState, string> = {
  idle: "bg-[var(--orb-idle)]",
  connecting: "bg-[var(--orb-idle)]",
  listening: "bg-[var(--orb-listening)]",
  thinking: "bg-[var(--orb-thinking)]",
  speaking: "bg-[var(--orb-speaking)]",
  interrupted: "bg-[var(--orb-listening)]",
  reconnecting: "bg-[var(--orb-idle)]",
  ended: "bg-[var(--orb-idle)]",
  error: "bg-destructive",
}

export default function VoiceOrb({ state, amplitude = 0 }: Props) {
  const scale = 1 + amplitude * 0.4

  const isPulsing = state === "listening" || state === "interrupted"
  const isBreathing = state === "thinking"
  const isSpeaking = state === "speaking"

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      {/* Outer ring — pulse when listening */}
      {isPulsing && (
        <div
          className={cn(
            "absolute inset-0 rounded-full opacity-30 animate-ping",
            STATE_COLORS[state]
          )}
        />
      )}

      {/* Main orb */}
      <div
        className={cn(
          "w-20 h-20 rounded-full transition-colors duration-500 shadow-lg",
          STATE_COLORS[state],
          isBreathing && "animate-pulse"
        )}
        style={{
          transform: isSpeaking ? `scale(${scale})` : "scale(1)",
          transition: isSpeaking ? "transform 80ms ease-out" : "transform 300ms ease-out, background-color 500ms",
          boxShadow: state === "speaking"
            ? `0 0 ${12 + amplitude * 24}px 4px color-mix(in srgb, var(--orb-speaking) 30%, transparent)`
            : state === "listening"
            ? "0 0 16px 4px color-mix(in srgb, var(--orb-listening) 25%, transparent)"
            : "0 4px 24px rgba(0,0,0,0.12)",
        }}
      />
    </div>
  )
}
