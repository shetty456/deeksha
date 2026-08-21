"use client"

import type { AudioState } from "@/lib/voice/types"

interface Props {
  state: AudioState
  amplitude?: number // 0–1
}

const ORB_COLOR: Record<AudioState, string> = {
  idle:        "var(--orb-idle)",
  connecting:  "var(--orb-idle)",
  listening:   "var(--orb-listening)",
  interrupted: "var(--orb-listening)",
  thinking:    "var(--orb-thinking)",
  speaking:    "var(--orb-speaking)",
  reconnecting:"var(--orb-idle)",
  ended:       "var(--orb-idle)",
  error:       "var(--destructive)",
}

export default function VoiceOrb({ state, amplitude = 0 }: Props) {
  const color = ORB_COLOR[state]
  const isListening  = state === "listening" || state === "interrupted"
  const isThinking   = state === "thinking"
  const isSpeaking   = state === "speaking"
  const isIdle       = state === "idle" || state === "connecting" || state === "ended"

  // Amplitude-driven scale: 1.0 at silence → up to 1.35 at peak
  const speakScale = isSpeaking  ? 1 + amplitude * 0.35 : 1
  const listenScale = isListening ? 1 + amplitude * 0.15 : 1

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>

      {/* ── Expanding rings (listening) ───────────────────────── */}
      {isListening && (
        <>
          <span style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
            opacity: 0,
            animation: "orb-ring-expand 1.8s ease-out infinite",
          }} />
          <span style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
            opacity: 0,
            animation: "orb-ring-expand 1.8s ease-out 0.6s infinite",
          }} />
          <span style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
            opacity: 0,
            animation: "orb-ring-expand 1.8s ease-out 1.2s infinite",
          }} />
        </>
      )}

      {/* ── Spinning gradient ring (thinking) ─────────────────── */}
      {isThinking && (
        <span style={{
          position: "absolute",
          width: 130,
          height: 130,
          borderRadius: "50%",
          background: `conic-gradient(from 0deg, transparent 40%, ${color} 70%, transparent 100%)`,
          animation: "orb-spin 1.2s linear infinite",
          filter: "blur(3px)",
        }} />
      )}

      {/* ── Glow layer ────────────────────────────────────────── */}
      <span style={{
        position: "absolute",
        width: 110,
        height: 110,
        borderRadius: "50%",
        background: color,
        filter: `blur(${isSpeaking ? 28 + amplitude * 24 : isListening ? 20 : 14}px)`,
        opacity: isIdle ? 0.25 : isSpeaking ? 0.45 + amplitude * 0.3 : 0.35,
        transition: "opacity 600ms, filter 80ms",
        transform: `scale(${isSpeaking ? speakScale : 1})`,
      }} />

      {/* ── Core orb ──────────────────────────────────────────── */}
      <span style={{
        position: "relative",
        display: "block",
        width: 96,
        height: 96,
        borderRadius: "50%",
        background: isThinking
          ? `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${color} 80%, white), ${color})`
          : color,
        boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 20%, transparent)`,
        transition: "background 500ms, box-shadow 500ms",
        transform: `scale(${isSpeaking ? speakScale : isListening ? listenScale : 1})`,
        animation: isIdle
          ? "orb-breathe 3.5s ease-in-out infinite"
          : isThinking
          ? "orb-thinking-pulse 1.4s ease-in-out infinite"
          : "none",
        willChange: "transform",
      }} />
    </div>
  )
}
