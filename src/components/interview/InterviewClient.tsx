"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { AudioState } from "@/lib/voice/types"
import { DeepgramSpeechRecognizer } from "@/lib/voice/deepgram-recognizer"
import { DeepgramSpeechSynthesizer } from "@/lib/voice/deepgram-synthesizer"
import { InterviewEngine, type Question } from "@/lib/interview/engine"
import { logEvent } from "@/lib/telemetry"
import VoiceOrb from "./VoiceOrb"
import InterviewTimer from "./InterviewTimer"

interface Props {
  interviewId: string
  question: Question
  category: string
  difficulty: string
  durationSeconds: number
}

const STATE_LABELS: Record<AudioState, string> = {
  idle: "Getting ready…",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Thinking…",
  speaking: "Speaking",
  interrupted: "Listening",
  reconnecting: "Reconnecting…",
  ended: "Interview ended",
  error: "Connection error",
}

export default function InterviewClient({
  interviewId,
  question,
  category,
  difficulty,
  durationSeconds,
}: Props) {
  const router = useRouter()
  const [audioState, setAudioState] = useState<AudioState>("idle")
  const [amplitude, setAmplitude] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [partialTranscript, setPartialTranscript] = useState("")
  const [turnCount, setTurnCount] = useState(0)
  const [ending, setEnding] = useState(false)

  const recognizerRef = useRef<DeepgramSpeechRecognizer | null>(null)
  const synthesizerRef = useRef<DeepgramSpeechSynthesizer | null>(null)
  const engineRef = useRef<InterviewEngine | null>(null)
  const amplitudeRafRef = useRef<number>(0)
  const sequenceRef = useRef(0)
  const isMountedRef = useRef(true)

  const persistTurn = useCallback(
    async (speaker: "interviewer" | "candidate", text: string) => {
      sequenceRef.current++
      await fetch("/api/interview/turns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_id: interviewId,
          speaker,
          text,
          sequence: sequenceRef.current,
          started_at: new Date().toISOString(),
        }),
      }).catch(() => {}) // best-effort
    },
    [interviewId]
  )

  const endInterview = useCallback(async () => {
    if (ending) return
    setEnding(true)
    setAudioState("ended")

    recognizerRef.current?.disconnect()
    synthesizerRef.current?.interrupt()
    synthesizerRef.current?.disconnect()
    engineRef.current?.end()
    cancelAnimationFrame(amplitudeRafRef.current)

    logEvent("interview_completed")

    // Mark interview complete
    await fetch("/api/interview/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id: interviewId }),
    }).catch(() => {})

    // Trigger evaluation
    logEvent("evaluation_started")
    await fetch("/api/evaluation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id: interviewId }),
    }).catch(() => {})

    logEvent("evaluation_completed")
    router.push(`/results/${interviewId}`)
  }, [ending, interviewId, router])

  const handleCandidateTurn = useCallback(
    async (transcript: string) => {
      if (!isMountedRef.current || ending) return
      const engine = engineRef.current
      if (!engine) return

      engine.addCandidateTurn(transcript)
      setTurnCount((n) => n + 1)
      setPartialTranscript("")
      setAudioState("thinking")

      await persistTurn("candidate", transcript)
      logEvent("user_turn_ended")

      if (!engine.shouldContinue()) {
        await endInterview()
        return
      }

      // Get AI response via streaming LLM
      logEvent("llm_started")
      const ctx = engine.getContext()

      const res = await fetch("/api/interview/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ctx),
      })

      if (!res.ok || !res.body || !isMountedRef.current) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let firstToken = true
      let fullResponse = ""

      async function* tokenStream(): AsyncIterable<string> {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          if (firstToken) {
            logEvent("llm_first_token")
            firstToken = false
          }
          fullResponse += text
          yield text
        }
      }

      setAudioState("speaking")
      logEvent("tts_started")

      const synth = synthesizerRef.current
      if (!synth) return

      await synth.speak(tokenStream())

      if (!isMountedRef.current || ending) return

      engine.addInterviewerTurn(fullResponse)
      await persistTurn("interviewer", fullResponse)
      setAudioState("listening")
    },
    [ending, endInterview, persistTurn]
  )

  // Initialize interview on mount
  useEffect(() => {
    isMountedRef.current = true

    async function init() {
      setAudioState("connecting")
      logEvent("interview_started")

      const recognizer = new DeepgramSpeechRecognizer()
      const synthesizer = new DeepgramSpeechSynthesizer()
      const engine = new InterviewEngine()

      recognizerRef.current = recognizer
      synthesizerRef.current = synthesizer
      engineRef.current = engine

      engine.start({
        interviewId,
        question,
        category,
        difficulty,
        durationSeconds,
      })

      try {
        await recognizer.connect()
        logEvent("microphone_connected")
        await synthesizer.connect()

        // Amplitude polling for orb animation
        const pollAmplitude = () => {
          setAmplitude(synthesizer.getAmplitude())
          amplitudeRafRef.current = requestAnimationFrame(pollAmplitude)
        }
        amplitudeRafRef.current = requestAnimationFrame(pollAmplitude)

        // Wire up speech recognition
        recognizer.onPartialTranscript((text) => {
          setPartialTranscript(text)
        })

        recognizer.onFinalTranscript((text) => {
          if (!text.trim()) return
          logEvent("user_turn_ended")
          handleCandidateTurn(text)
        })

        recognizer.onSpeechStarted(() => {
          logEvent("user_turn_started")
          // Barge-in: if AI is speaking, interrupt it
          if (audioState === "speaking" || (synthesizerRef.current?.getAmplitude() ?? 0) > 0) {
            synthesizerRef.current?.interrupt()
            logEvent("ai_interrupted")
            setAudioState("interrupted")
          }
        })

        recognizer.onSpeechEnded(() => {
          setPartialTranscript("")
        })

        recognizer.onError((err) => {
          console.error("STT error:", err)
          setAudioState("error")
        })

        recognizer.startListening()
        logEvent("stt_connected")

        setStartedAt(Date.now())

        // Start the interview: AI asks the first question
        setAudioState("thinking")
        const ctx = engine.getContext()

        const res = await fetch("/api/interview/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ctx),
        })

        if (!res.ok || !res.body || !isMountedRef.current) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let firstToken = true
        let fullResponse = ""

        async function* tokenStream(): AsyncIterable<string> {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const text = decoder.decode(value, { stream: true })
            if (firstToken) {
              logEvent("llm_first_token")
              firstToken = false
            }
            fullResponse += text
            yield text
          }
        }

        setAudioState("speaking")
        logEvent("tts_started")
        await synthesizer.speak(tokenStream())

        if (!isMountedRef.current) return

        engine.addInterviewerTurn(fullResponse)
        await persistTurn("interviewer", fullResponse)
        setAudioState("listening")
      } catch (err) {
        console.error("Interview init error:", err)
        setAudioState("error")
      }
    }

    init()

    return () => {
      isMountedRef.current = false
      recognizerRef.current?.disconnect()
      synthesizerRef.current?.interrupt()
      synthesizerRef.current?.disconnect()
      cancelAnimationFrame(amplitudeRafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Barge-in: wire speech-started to interrupt synthesizer
  useEffect(() => {
    const recognizer = recognizerRef.current
    const synthesizer = synthesizerRef.current
    if (!recognizer || !synthesizer) return

    recognizer.onSpeechStarted(() => {
      logEvent("user_turn_started")
      if (audioState === "speaking") {
        synthesizer.interrupt()
        logEvent("ai_interrupted")
        setAudioState("interrupted")
      }
    })
  }, [audioState])

  const categoryLabel = category.replace(/_/g, " ")

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-between px-6 py-10">
      {/* Top: branding + category */}
      <div className="w-full flex items-center justify-between max-w-sm">
        <span className="text-sm font-semibold text-text-primary">Deeksha</span>
        <span className="text-xs text-text-secondary capitalize">{categoryLabel}</span>
      </div>

      {/* Center: state label + orb */}
      <div className="flex flex-col items-center gap-8">
        <p className="text-sm font-medium text-text-secondary tracking-wide">
          {STATE_LABELS[audioState]}
        </p>

        <VoiceOrb state={audioState} amplitude={amplitude} />

        {/* Partial transcript hint */}
        {partialTranscript && (
          <p className="text-xs text-text-tertiary max-w-xs text-center line-clamp-2 italic">
            {partialTranscript}
          </p>
        )}
      </div>

      {/* Bottom: turn count + timer + end button */}
      <div className="w-full max-w-sm flex items-center justify-between">
        <div className="text-xs text-text-secondary">
          <span>Turn {turnCount}</span>
        </div>

        <div className="text-xs text-text-secondary">
          <InterviewTimer
            startedAt={startedAt}
            durationSeconds={durationSeconds}
            onExpired={endInterview}
          />
        </div>

        <button
          onClick={endInterview}
          disabled={ending}
          className="text-xs text-text-secondary hover:text-destructive transition-colors disabled:opacity-50"
        >
          {ending ? "Ending…" : "End Interview"}
        </button>
      </div>
    </div>
  )
}
