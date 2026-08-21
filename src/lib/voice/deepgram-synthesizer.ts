import type { SpeechSynthesizer } from "./types"

export class DeepgramSpeechSynthesizer implements SpeechSynthesizer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private abortController: AbortController | null = null
  private amplitude = 0
  private rafId = 0

  private speechStartCallback: (() => void) | null = null
  private speechEndCallback: (() => void) | null = null

  async connect(): Promise<void> {
    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.connect(this.audioContext.destination)
    this.startAmplitudePoll()
  }

  private startAmplitudePoll() {
    const analyser = this.analyser
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      if (!this.analyser) return // stopped — don't reschedule
      this.analyser.getByteFrequencyData(data)
      this.amplitude = data.reduce((a, b) => a + b, 0) / data.length / 255
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  disconnect(): void {
    cancelAnimationFrame(this.rafId)
    this.interrupt()
    this.analyser = null
    this.audioContext?.close()
    this.audioContext = null
  }

  interrupt(): void {
    this.abortController?.abort()
    this.currentSource?.stop()
    this.currentSource = null
    this.abortController = null
  }

  async speak(textStream: AsyncIterable<string>): Promise<void> {
    if (!this.audioContext) return

    this.abortController = new AbortController()
    const signal = this.abortController.signal

    this.speechStartCallback?.()

    let pendingSentence = ""

    const flushSentence = async (sentence: string) => {
      if (!sentence.trim() || signal.aborted) return
      try {
        await this.synthesizeAndPlay(sentence, signal)
      } catch {
        // interrupted or aborted — swallow
      }
    }

    try {
      for await (const chunk of textStream) {
        if (signal.aborted) break
        pendingSentence += chunk

        // Flush on sentence boundary for low first-audio latency
        const match = pendingSentence.match(/[.!?]\s+|[.!?]$/)
        if (match?.index !== undefined) {
          const idx = match.index + match[0].length
          const sentence = pendingSentence.slice(0, idx)
          pendingSentence = pendingSentence.slice(idx)
          await flushSentence(sentence)
        }
      }
      if (pendingSentence.trim() && !signal.aborted) {
        await flushSentence(pendingSentence)
      }
    } finally {
      this.speechEndCallback?.()
    }
  }

  private async synthesizeAndPlay(text: string, signal: AbortSignal): Promise<void> {
    if (!this.audioContext || signal.aborted) return

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal,
    })

    if (!res.ok || !res.body || signal.aborted) return

    const arrayBuffer = await res.arrayBuffer()
    if (signal.aborted || !this.audioContext) return

    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
    if (signal.aborted || !this.audioContext) return

    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.analyser ?? this.audioContext.destination)
    this.currentSource = source

    await new Promise<void>((resolve) => {
      source.onended = () => resolve()
      source.start()
    })
  }

  onSpeechStart(cb: () => void) { this.speechStartCallback = cb }
  onSpeechEnd(cb: () => void) { this.speechEndCallback = cb }
  getAmplitude(): number { return this.amplitude }
}
