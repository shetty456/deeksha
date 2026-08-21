import { devLog } from "@/lib/dev-log"
import type { SpeechRecognizer } from "./types"

const SILENCE_THRESHOLD = 0.018  // RMS below this = silence
const SILENCE_DURATION_MS = 1500 // ms of silence after speech before we send to Whisper
const MIN_SPEECH_DURATION_MS = 2000 // ignore segments shorter than this (blocks noise triggers)
const POLL_INTERVAL_MS = 100

export class WhisperRecognizer implements SpeechRecognizer {
  private stream: MediaStream | null = null
  private audioCtx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaRecorder: MediaRecorder | null = null
  private mimeType = ""

  private muted = false
  private isListening = false
  private isSpeaking = false
  private speechStartedAt = 0
  private chunks: Blob[] = []

  private pollTimer: ReturnType<typeof setInterval> | null = null
  private silenceTimer: ReturnType<typeof setTimeout> | null = null

  private partialCallback: ((text: string) => void) | null = null
  private finalCallback: ((text: string) => void) | null = null
  private speechStartedCallback: (() => void) | null = null
  private speechEndedCallback: (() => void) | null = null
  private errorCallback: ((e: Error) => void) | null = null

  async connect(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.mimeType =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")           ? "audio/webm"
      : ""

    this.audioCtx = new AudioContext()
    const source = this.audioCtx.createMediaStreamSource(this.stream)
    this.analyser = this.audioCtx.createAnalyser()
    this.analyser.fftSize = 256
    source.connect(this.analyser)
  }

  disconnect(): void {
    this.isListening = false
    this.muted = false
    this.stopPoll()
    this.clearSilenceTimer()
    if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.audioCtx?.close()
    this.stream = null
    this.mediaRecorder = null
    this.audioCtx = null
    this.analyser = null
    this.chunks = []
    this.isSpeaking = false
  }

  mute(): void {
    this.muted = true
    this.clearSilenceTimer()
    if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop()
    this.isSpeaking = false
    this.chunks = []
  }

  unmute(): void {
    this.muted = false
    if (this.isListening) this.startPoll()
  }

  startListening(): void {
    this.isListening = true
    if (!this.muted) this.startPoll()
  }

  stopListening(): void {
    this.isListening = false
    this.stopPoll()
    this.clearSilenceTimer()
    if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop()
    this.isSpeaking = false
    this.chunks = []
  }

  private startPoll(): void {
    if (this.pollTimer) return
    this.pollTimer = setInterval(() => this.vadTick(), POLL_INTERVAL_MS)
  }

  private stopPoll(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  private getRMS(): number {
    if (!this.analyser) return 0
    const buf = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (const b of buf) {
      const n = (b - 128) / 128
      sum += n * n
    }
    return Math.sqrt(sum / buf.length)
  }

  private vadTick(): void {
    if (this.muted || !this.isListening) return
    const loud = this.getRMS() > SILENCE_THRESHOLD

    if (loud && !this.isSpeaking) {
      // Speech onset
      this.isSpeaking = true
      this.speechStartedAt = Date.now()
      this.clearSilenceTimer()
      devLog.push("stt", "speech start")
      this.speechStartedCallback?.()
      this.startRecording()
    } else if (!loud && this.isSpeaking && !this.silenceTimer) {
      // Possible end — start silence countdown
      this.silenceTimer = setTimeout(() => {
        this.silenceTimer = null
        this.isSpeaking = false
        this.speechEndedCallback?.()
        const duration = Date.now() - this.speechStartedAt
        if (duration < MIN_SPEECH_DURATION_MS) {
          devLog.push("stt", "segment too short, skipped", `${duration}ms`)
          this.chunks = []
          if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop()
          return
        }
        this.stopAndTranscribe()
      }, SILENCE_DURATION_MS)
    } else if (loud && this.isSpeaking) {
      // Still talking — cancel any pending silence timer
      this.clearSilenceTimer()
    }
  }

  private startRecording(): void {
    if (!this.stream) return
    this.chunks = []
    const options: MediaRecorderOptions = this.mimeType ? { mimeType: this.mimeType } : {}
    this.mediaRecorder = new MediaRecorder(this.stream, options)
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.mediaRecorder.start(250)
  }

  private stopAndTranscribe(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") {
      this.transcribe()
      return
    }
    this.mediaRecorder.onstop = () => this.transcribe()
    this.mediaRecorder.stop()
  }

  private async transcribe(): Promise<void> {
    if (this.chunks.length === 0) return
    const blob = new Blob(this.chunks, { type: this.mimeType || "audio/webm" })
    this.chunks = []

    const t0 = Date.now()
    devLog.push("req", "→ whisper/transcribe", `${(blob.size / 1024).toFixed(0)} KB`)

    try {
      const res = await fetch("/api/whisper/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/webm" },
        body: blob,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        devLog.push("error", "← whisper/transcribe", `${res.status}`, Date.now() - t0)
        console.warn("[whisper] transcribe failed:", res.status, body)
        return
      }
      const { text } = (await res.json()) as { text: string }
      devLog.push("res", "← whisper/transcribe", text?.trim() ? `"${text.trim().slice(0, 60)}"` : "(empty)", Date.now() - t0)
      if (text?.trim()) {
        this.finalCallback?.(text.trim())
      }
    } catch (err) {
      devLog.push("error", "← whisper/transcribe", String(err), Date.now() - t0)
      console.warn("[whisper] fetch error (will retry on next speech):", err)
    }
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
  }

  onPartialTranscript(cb: (text: string) => void) { this.partialCallback = cb }
  onFinalTranscript(cb: (text: string) => void)   { this.finalCallback = cb }
  onSpeechStarted(cb: () => void)                  { this.speechStartedCallback = cb }
  onSpeechEnded(cb: () => void)                    { this.speechEndedCallback = cb }
  onError(cb: (e: Error) => void)                  { this.errorCallback = cb }
}
