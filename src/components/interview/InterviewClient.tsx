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

const STATE_LABELS: Record<AudioState, string> = {
  idle:         "Getting ready…",
  connecting:   "Connecting…",
  listening:    "Listening",
  thinking:     "Thinking…",
  speaking:     "Speaking",
  interrupted:  "Listening",
  reconnecting: "Reconnecting…",
  ended:        "Interview ended",
  error:        "Something went wrong",
}

let turnId = 0

export default function InterviewClient({
  interviewId, question, category, difficulty, durationSeconds,
}: Props) {
  const router = useRouter()
  const [audioState, setAudioState]         = useState<AudioState>("idle")
  const [amplitude, setAmplitude]           = useState(0)
  const [startedAt, setStartedAt]           = useState<number | null>(null)
  const [partialTranscript, setPartialTranscript] = useState("")
  const [turns, setTurns]                   = useState<TranscriptTurn[]>([])
  const [ending, setEnding]                 = useState(false)

  const recognizerRef  = useRef<DeepgramSpeechRecognizer | null>(null)
  const synthesizerRef = useRef<DeepgramSpeechSynthesizer | null>(null)
  const engineRef      = useRef<InterviewEngine | null>(null)
  const rafRef         = useRef(0)
  const sequenceRef    = useRef(0)
  const isMountedRef   = useRef(true)
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [turns, partialTranscript])

  const addTurn = useCallback((speaker: TranscriptTurn["speaker"], text: string) => {
    setTurns((prev) => [...prev, { speaker, text, id: turnId++ }])
  }, [])

  const persistTurn = useCallback(async (speaker: "interviewer" | "candidate", text: string) => {
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

  /** Get AI response for a given context, stream it through TTS, return full text */
  const getAIResponse = useCallback(async (engine: InterviewEngine, synth: DeepgramSpeechSynthesizer, recog: DeepgramSpeechRecognizer): Promise<string | null> => {
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
      console.error("[interview] respond error:", res.status, err)
      setAudioState("error")
      return null
    }
    if (!res.body || !isMountedRef.current) return null

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let firstToken = true
    let fullResponse = ""

    async function* tokenStream(): AsyncIterable<string> {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        if (firstToken) { logEvent("llm_first_token"); firstToken = false }
        fullResponse += text
        yield text
      }
    }

    // Mute mic while AI speaks to prevent echo
    recog.mute()
    setAudioState("speaking")
    logEvent("tts_started")

    await synth.speak(tokenStream())

    recog.unmute()

    if (!isMountedRef.current) return null
    return fullResponse
  }, [])

  const handleCandidateTurn = useCallback(async (transcript: string) => {
    if (!isMountedRef.current || ending) return
    const engine = engineRef.current
    const synth  = synthesizerRef.current
    const recog  = recognizerRef.current
    if (!engine || !synth || !recog) return

    engine.addCandidateTurn(transcript)
    addTurn("candidate", transcript)
    setPartialTranscript("")
    await persistTurn("candidate", transcript)
    logEvent("user_turn_ended")

    if (!engine.shouldContinue()) { await endInterview(); return }

    const response = await getAIResponse(engine, synth, recog)
    if (!response || !isMountedRef.current) return

    engine.addInterviewerTurn(response)
    addTurn("interviewer", response)
    await persistTurn("interviewer", response)
    setAudioState("listening")
  }, [ending, endInterview, persistTurn, addTurn, getAIResponse])

  // Initialise on mount
  useEffect(() => {
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

        // Amplitude poll for orb
        const pollAmp = () => {
          setAmplitude(synthesizer.getAmplitude())
          rafRef.current = requestAnimationFrame(pollAmp)
        }
        rafRef.current = requestAnimationFrame(pollAmp)

        // Wire STT callbacks
        recognizer.onPartialTranscript((text) => {
          setPartialTranscript(text)
          // Barge-in: first partial while AI is speaking → interrupt
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
          if (!text.trim()) return
          handleCandidateTurn(text)
        })
        recognizer.onSpeechStarted(() => {
          logEvent("user_turn_started")
          // Barge-in: interrupt AI if speaking
          if (synthesizerRef.current && audioState === "speaking") {
            synthesizerRef.current.interrupt()
            recognizer.unmute()
            logEvent("ai_interrupted")
            setAudioState("interrupted")
          }
        })
        recognizer.onSpeechEnded(() => setPartialTranscript(""))
        recognizer.onError((err) => { console.error("STT:", err); setAudioState("error") })

        recognizer.startListening()
        logEvent("stt_connected")
        setStartedAt(Date.now())

        // AI opens the interview
        const response = await getAIResponse(engine, synthesizer, recognizer)
        if (!response || !isMountedRef.current) return

        engine.addInterviewerTurn(response)
        addTurn("interviewer", response)
        await persistTurn("interviewer", response)
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
      cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categoryLabel = category.replace(/_/g, " ")

  return (
    <div className="min-h-dvh bg-bg-primary flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-separator">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold text-label-primary">Deeksha</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-label-secondary capitalize">{categoryLabel}</span>
            <InterviewTimer
              startedAt={startedAt}
              durationSeconds={durationSeconds}
              onExpired={endInterview}
            />
          </div>
        </div>
      </nav>

      {/* Body — orb left, transcript right */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col lg:flex-row gap-6">

        {/* Left: orb + state */}
        <div className="lg:w-64 flex flex-col items-center justify-center gap-6 lg:sticky lg:top-24 lg:self-start lg:h-[calc(100vh-8rem)]">
          <p className="text-sm font-medium text-label-secondary tracking-wide">
            {STATE_LABELS[audioState]}
          </p>

          <VoiceOrb state={audioState} amplitude={amplitude} />

          {partialTranscript && (
            <p className="text-xs text-label-tertiary max-w-[180px] text-center italic line-clamp-2">
              {partialTranscript}
            </p>
          )}

          <button
            onClick={endInterview}
            disabled={ending}
            className="text-xs text-label-secondary hover:text-destructive transition-colors disabled:opacity-50 mt-2"
          >
            {ending ? "Ending…" : "End Interview"}
          </button>
        </div>

        {/* Right: transcript */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pb-4">
            {turns.length === 0 && audioState === "connecting" && (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm text-label-tertiary">Connecting to your interviewer…</p>
              </div>
            )}

            {turns.map((turn) => (
              <div
                key={turn.id}
                className={cn(
                  "flex gap-3",
                  turn.speaker === "candidate" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5",
                  turn.speaker === "interviewer"
                    ? "bg-accent text-white"
                    : "bg-bg-card border border-separator text-label-secondary"
                )}>
                  {turn.speaker === "interviewer" ? "AI" : "Me"}
                </div>

                {/* Bubble */}
                <div className={cn(
                  "max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                  turn.speaker === "interviewer"
                    ? "bg-bg-card border border-separator text-label-primary"
                    : "bg-accent/10 text-label-primary border border-accent/20"
                )}>
                  {turn.text}
                </div>
              </div>
            ))}

            {/* Live partial transcript */}
            {partialTranscript && (
              <div className="flex gap-3 flex-row-reverse opacity-60">
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5 bg-bg-card border border-separator text-label-secondary">
                  Me
                </div>
                <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed bg-accent/5 border border-accent/10 text-label-secondary italic">
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
