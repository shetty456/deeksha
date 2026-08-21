import type { SpeechRecognizer } from "./types"

export class DeepgramSpeechRecognizer implements SpeechRecognizer {
  private ws: WebSocket | null = null
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private apiKey: string | null = null
  private muted = false
  private isListening = false   // true while we expect to be transcribing
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null
  private mimeType = ""

  private partialCallback: ((text: string) => void) | null = null
  private finalCallback: ((text: string) => void) | null = null
  private errorCallback: ((e: Error) => void) | null = null

  async connect(): Promise<void> {
    const res = await fetch("/api/deepgram/token")
    const { key } = await res.json()
    this.apiKey = key
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.mimeType =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")           ? "audio/webm"
      : ""
  }

  disconnect(): void {
    this.isListening = false
    this.stopKeepAlive()
    this.mediaRecorder?.stop()
    this.ws?.close(1000, "client disconnect")
    this.stream?.getTracks().forEach((t) => t.stop())
    this.ws = null
    this.mediaRecorder = null
    this.stream = null
  }

  mute(): void {
    this.muted = true
    // KeepAlive prevents Deepgram from closing the WebSocket while no audio flows
    this.keepAliveTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "KeepAlive" }))
      }
    }, 5000)
  }

  unmute(): void {
    this.muted = false
    this.stopKeepAlive()
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
  }

  startListening(): void {
    this.isListening = true
    this.openSocket()
  }

  private openSocket(): void {
    if (!this.apiKey || !this.stream) return

    // Close any existing socket cleanly before reopening
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.onclose = null   // prevent reconnect loop
      this.ws.close(1000, "reconnect")
    }
    this.mediaRecorder?.stop()

    const params = new URLSearchParams({
      model:           "nova-2",
      language:        "en-US",
      smart_format:    "true",
      interim_results: "true",
      endpointing:     "1500",
      punctuate:       "true",
    })

    this.ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${params}`,
      ["token", this.apiKey]
    )

    this.ws.onopen = () => {
      if (!this.stream) return
      const options: MediaRecorderOptions = this.mimeType ? { mimeType: this.mimeType } : {}
      this.mediaRecorder = new MediaRecorder(this.stream, options)
      this.mediaRecorder.ondataavailable = (e) => {
        if (this.muted || !e.data.size) return
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(e.data)
        }
      }
      this.mediaRecorder.start(250)
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "Results") {
          const alt = data.channel?.alternatives?.[0]
          if (!alt?.transcript) return
          if (data.is_final && data.speech_final) {
            this.finalCallback?.(alt.transcript)
          } else if (!data.is_final) {
            this.partialCallback?.(alt.transcript)
          }
        }
      } catch { /* ignore malformed */ }
    }

    this.ws.onerror = (e) => {
      console.error("[deepgram] WebSocket error", e)
    }

    this.ws.onclose = (e) => {
      console.warn("[deepgram] closed — code:", e.code, "muted:", this.muted)
      if (this.isListening) {
        // Deepgram closed the connection while we still need it — reconnect
        console.warn("[deepgram] reconnecting in 500ms…")
        setTimeout(() => {
          if (this.isListening) this.openSocket()
        }, 500)
      }
    }
  }

  stopListening(): void {
    this.isListening = false
    this.stopKeepAlive()
    this.mediaRecorder?.stop()
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "CloseStream" }))
    }
  }

  onPartialTranscript(cb: (text: string) => void) { this.partialCallback = cb }
  onFinalTranscript(cb: (text: string) => void)   { this.finalCallback = cb }
  onSpeechStarted(cb: () => void)  { /* unused */ }
  onSpeechEnded(cb: () => void)    { /* unused */ }
  onError(cb: (e: Error) => void)  { this.errorCallback = cb }
}
