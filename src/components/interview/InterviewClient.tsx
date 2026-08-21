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
import { cn } from "@/lib/utils"

interface Props {
  interviewId: string
  question: Question
  category: string
  difficulty: string
  durationSeconds: number
}

interface TranscriptTurn {
  speaker: "interviewer" | "candidate"
  text: string
  id: number
}

const STATE_LABEL: Record<AudioState, string> = {
  idle:         "Starting…",
  connecting:   "Connecting…",
  listening:    "Listening",
  interrupted:  "Listening",
  thinking:     "Thinking…",
  speaking:     "Speaking",
  reconnecting: "Reconnecting…",
  ended:        "Ending…",
  error:        "Connection error",
}

const STATE_SUBLABEL: Partial<Record<AudioState, string>> = {
  listening:  "Your mic is open — speak when ready",
  thinking:   "Formulating a response…",
  speaking:   "Interviewer is speaking",
  connecting: "Setting up your interview session",
}

let turnId = 0

export default function InterviewClient({
  interviewId, question, category, difficulty, durationSeconds,
}: Props) {
  const router = useRouter()
  const [audioState, setAudioState]               = useState<AudioState>("idle")
  const [amplitude, setAmplitude]                 = useState(0)
  const [startedAt, setStartedAt]                 = useState<number | null>(null)
  const [partialTranscript, setPartialTranscript] = useState("")
  const [turns, setTurns]                         = useState<TranscriptTurn[]>([])
  const [ending, setEnding]                       = useState(false)

  const recognizerRef    = useRef<DeepgramSpeechRecognizer | null>(null)
  const synthesizerRef   = useRef<DeepgramSpeechSynthesizer | null>(null)
  const engineRef        = useRef<InterviewEngine | null>(null)
  const rafRef           = useRef(0)
  const sequenceRef      = useRef(0)
  const isMountedRef     = useRef(true)
  const hasInitialized   = useRef(false)   // prevents React Strict Mode double-init
  const isProcessingTurn = useRef(false)   // prevents concurrent handleCandidateTurn calls
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [turns, partialTranscript])

  const addTurn = useCallback((speaker: TranscriptTurn["speaker"], text: string) => {
    setTurns((prev) => [...prev, { speaker, text, id: turnId++ }])
  }, [])

  const persistTurn = useCallback(async (speaker: "interviewer" | "candidate", text: string) => {
    sequenceRef.current++
    fetch("/api/interview/turns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interview_id: interviewId,
        speaker,
        text,
        sequence: sequenceRef.current,
        started_at: new Date().toISOString(),
      }),
    }).catch(() => {})
  }, [interviewId])

  const endInterview = useCallback(async () => {
    if (ending) return
    setEnding(true)
    setAudioState("ended")
    recognizerRef.current?.stopListening()
    recognizerRef.current?.disconnect()
    synthesizerRef.current?.interrupt()
    synthesizerRef.current?.disconnect()
    engineRef.current?.end()
    cancelAnimationFrame(rafRef.current)
    logEvent("interview_completed")

    await fetch("/api/interview/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id: interviewId }),
    }).catch(() => {})

    logEvent("evaluation_started")
    await fetch("/api/evaluation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id: interviewId }),
    }).catch(() => {})
    logEvent("evaluation_completed")
    router.push(`/results/${interviewId}`)
  }, [ending, interviewId, router])

  const getAIResponse = useCallback(async (
    engine: InterviewEngine,
    synth: DeepgramSpeechSynthesizer,
    recog: DeepgramSpeechRecognizer,
  ): Promise<string | null> => {
    setAudioState("thinking")
    logEvent("llm_started")

    const ctx = engine.getContext()
    const res = await fetch("/api/interview/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ctx),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error("[interview] respond:", res.status, err)
      setAudioState("error")
      return null
    }
    if (!res.body || !isMountedRef.current) return null

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let firstToken = true
    let full = ""

    async function* stream(): AsyncIterable<string> {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        if (firstToken) { logEvent("llm_first_token"); firstToken = false }
        full += text
        yield text
      }
    }

    recog.mute()
    setAudioState("speaking")
    logEvent("tts_started")
    await synth.speak(stream())
    recog.unmute()

    if (!isMountedRef.current) return null
    return full
  }, [])

  const handleCandidateTurn = useCallback(async (transcript: string) => {
    if (!isMountedRef.current || ending) return
    if (isProcessingTurn.current) return   // drop if a turn is already in flight
    isProcessingTurn.current = true

    try {
      const engine = engineRef.current
      const synth  = synthesizerRef.current
      const recog  = recognizerRef.current
      if (!engine || !synth || !recog) return

      engine.addCandidateTurn(transcript)
      addTurn("candidate", transcript)
      setPartialTranscript("")
      persistTurn("candidate", transcript)
      logEvent("user_turn_ended")

      if (!engine.shouldContinue()) { await endInterview(); return }

      const response = await getAIResponse(engine, synth, recog)
      if (!response || !isMountedRef.current) return

      engine.addInterviewerTurn(response)
      addTurn("interviewer", response)
      persistTurn("interviewer", response)
      setAudioState("listening")
    } finally {
      isProcessingTurn.current = false
    }
  }, [ending, endInterview, persistTurn, addTurn, getAIResponse])

  useEffect(() => {
    if (hasInitialized.current) return   // React Strict Mode guard — prevent double-init
    hasInitialized.current = true
    isMountedRef.current = true

    async function init() {
      setAudioState("connecting")
      logEvent("interview_started")

      const recognizer  = new DeepgramSpeechRecognizer()
      const synthesizer = new DeepgramSpeechSynthesizer()
      const engine      = new InterviewEngine()

      recognizerRef.current  = recognizer
      synthesizerRef.current = synthesizer
      engineRef.current      = engine
      engine.start({ interviewId, question, category, difficulty, durationSeconds })

      try {
        await recognizer.connect()
        logEvent("microphone_connected")
        await synthesizer.connect()

        const pollAmp = () => {
          setAmplitude(synthesizer.getAmplitude())
          rafRef.current = requestAnimationFrame(pollAmp)
        }
        rafRef.current = requestAnimationFrame(pollAmp)

        recognizer.onPartialTranscript((text) => {
          setPartialTranscript(text)
          // Barge-in on first partial while AI speaks
          setAudioState((prev) => {
            if (prev === "speaking") {
              synthesizerRef.current?.interrupt()
              recognizerRef.current?.unmute()
              logEvent("ai_interrupted")
              return "interrupted"
            }
            return prev
          })
        })

        recognizer.onFinalTranscript((text) => {
          const clean = text.trim()
          if (!clean) return
          // Ignore single words / filler ("So", "Um", "Okay") — not a real turn
          if (clean.split(/\s+/).length < 4) return
          handleCandidateTurn(clean)
        })

        recognizer.onSpeechEnded(() => setPartialTranscript(""))
        recognizer.onError((err) => { console.error("STT:", err); setAudioState("error") })

        recognizer.startListening()
        logEvent("stt_connected")
        setStartedAt(Date.now())

        const response = await getAIResponse(engine, synthesizer, recognizer)
        if (!response || !isMountedRef.current) return

        engine.addInterviewerTurn(response)
        addTurn("interviewer", response)
        persistTurn("interviewer", response)
        setAudioState("listening")

      } catch (err) {
        console.error("Interview init:", err)
        setAudioState("error")
      }
    }

    init()

    return () => {
      isMountedRef.current = false
      recognizerRef.current?.disconnect()
      synthesizerRef.current?.interrupt()
      synthesizerRef.current?.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categoryLabel = category.replace(/_/g, " ")

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#09090b" }}>

      {/* Nav — minimal, dark */}
      <nav className="flex items-center justify-between px-6 h-14 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <span className="text-sm font-semibold text-white/80 tracking-tight">Deeksha</span>
        <div className="flex items-center gap-4">
          <span className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>{categoryLabel}</span>
          <span className="text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.4)" }}>
            <InterviewTimer startedAt={startedAt} durationSeconds={durationSeconds} onExpired={endInterview} />
          </span>
        </div>
      </nav>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* Left — orb panel */}
        <div className="lg:w-[380px] flex flex-col items-center justify-center gap-6 px-8 py-12 lg:py-0 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">

          {/* State label */}
          <div className="text-center space-y-1.5 h-12 flex flex-col justify-end">
            <p className="text-base font-semibold text-white/90 tracking-tight">
              {STATE_LABEL[audioState]}
            </p>
            {STATE_SUBLABEL[audioState] && (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {STATE_SUBLABEL[audioState]}
              </p>
            )}
          </div>

          <VoiceOrb state={audioState} amplitude={amplitude} />

          {/* Partial transcript hint */}
          <div className="h-8 flex items-center">
            {partialTranscript && (
              <p className="text-xs text-center max-w-[200px] italic" style={{ color: "rgba(255,255,255,0.4)" }}>
                {partialTranscript}
              </p>
            )}
          </div>

          <button
            onClick={endInterview}
            disabled={ending}
            className="text-xs px-4 py-2 rounded-md border transition-colors disabled:opacity-40"
            style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.12)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            {ending ? "Ending…" : "End Interview"}
          </button>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Right — transcript */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-5">

            {turns.length === 0 && (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
                  The conversation will appear here.
                </p>
              </div>
            )}

            {turns.map((turn) => (
              <div
                key={turn.id}
                className={cn("flex gap-3 turn-animate", turn.speaker === "candidate" ? "flex-row-reverse" : "flex-row")}
              >
                {/* Speaker chip */}
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={turn.speaker === "interviewer"
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)" }
                  }
                >
                  {turn.speaker === "interviewer" ? "AI" : "Me"}
                </div>

                {/* Bubble */}
                <div
                  className="max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed"
                  style={turn.speaker === "interviewer"
                    ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.08)" }
                    : { background: "rgba(10,132,255,0.15)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(10,132,255,0.2)" }
                  }
                >
                  {turn.text}
                </div>
              </div>
            ))}

            {/* Partial — faded right-aligned */}
            {partialTranscript && (
              <div className="flex gap-3 flex-row-reverse opacity-50 turn-animate">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Me
                </div>
                <div
                  className="max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed italic"
                  style={{ background: "rgba(10,132,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(10,132,255,0.1)" }}
                >
                  {partialTranscript}
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
