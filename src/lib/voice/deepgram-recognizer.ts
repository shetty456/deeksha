import type { SpeechRecognizer } from "./types"

export class DeepgramSpeechRecognizer implements SpeechRecognizer {
  private ws: WebSocket | null = null
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private apiKey: string | null = null
  private muted = false

  private partialCallback: ((text: string) => void) | null = null
  private finalCallback: ((text: string) => void) | null = null
  private speechStartedCallback: (() => void) | null = null
  private speechEndedCallback: (() => void) | null = null
  private errorCallback: ((e: Error) => void) | null = null

  async connect(): Promise<void> {
    const res = await fetch("/api/deepgram/token")
    const { key } = await res.json()
    this.apiKey = key
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  }

  disconnect(): void {
    this.ws?.close()
    this.mediaRecorder?.stop()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.ws = null
    this.mediaRecorder = null
    this.stream = null
  }

  /** Pause sending audio to Deepgram while AI is speaking (prevents echo) */
  mute(): void { this.muted = true }
  unmute(): void { this.muted = false }

  startListening(): void {
    if (!this.apiKey || !this.stream) return

    const params = new URLSearchParams({
      model: "nova-3",
      language: "en-US",
      smart_format: "true",
      interim_results: "true",
      endpointing: "400",
      vad_events: "true",
      encoding: "linear16",
      sample_rate: "16000",
      channels: "1",
    })

    this.ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${params}`,
      ["token", this.apiKey]
    )

    this.ws.onopen = () => {
      if (!this.stream) return
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm;codecs=opus",
      })
      this.mediaRecorder.ondataavailable = (e) => {
        if (this.muted) return
        if (e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(e.data)
        }
      }
      this.mediaRecorder.start(100)
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === "SpeechStarted") {
          this.speechStartedCallback?.()
          return
        }
        if (data.type === "UtteranceEnd") {
          this.speechEndedCallback?.()
          return
        }
        if (data.type === "Results") {
          const alt = data.channel?.alternatives?.[0]
          if (!alt?.transcript) return
          if (data.is_final && data.speech_final) {
            this.finalCallback?.(alt.transcript)
          } else if (!data.is_final) {
            this.partialCallback?.(alt.transcript)
          }
        }
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onerror = () => {
      this.errorCallback?.(new Error("Deepgram WebSocket error"))
    }
  }

  stopListening(): void {
    this.mediaRecorder?.stop()
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "CloseStream" }))
    }
  }

  onPartialTranscript(cb: (text: string) => void) { this.partialCallback = cb }
  onFinalTranscript(cb: (text: string) => void) { this.finalCallback = cb }
  onSpeechStarted(cb: () => void) { this.speechStartedCallback = cb }
  onSpeechEnded(cb: () => void) { this.speechEndedCallback = cb }
  onError(cb: (e: Error) => void) { this.errorCallback = cb }
}
