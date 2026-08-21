import type { SpeechSynthesizer } from "./types"

export class DeepgramSpeechSynthesizer implements SpeechSynthesizer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private abortController: AbortController | null = null
  private amplitude = 0

  private speechStartCallback: (() => void) | null = null
  private speechEndCallback: (() => void) | null = null

  async connect(): Promise<void> {
    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.connect(this.audioContext.destination)
    this.updateAmplitude()
  }

  private updateAmplitude() {
    if (!this.analyser) return
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    const tick = () => {
      this.analyser!.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      this.amplitude = avg / 255
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  disconnect(): void {
    this.interrupt()
    this.audioContext?.close()
    this.audioContext = null
    this.analyser = null
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

    let fullText = ""
    const chunks: string[] = []

    // Collect text chunks and send sentences to TTS as they form
    const sentenceBuffer: string[] = []
    let pendingSentence = ""

    const flushSentence = async (sentence: string) => {
      if (!sentence.trim() || signal.aborted) return
      try {
        await this.synthesizeAndPlay(sentence, signal)
      } catch {
        // interrupted or aborted
      }
    }

    this.speechStartCallback?.()

    try {
      for await (const chunk of textStream) {
        if (signal.aborted) break
        fullText += chunk
        chunks.push(chunk)
        pendingSentence += chunk

        // Flush on sentence boundaries for low latency
        const sentenceEnd = /[.!?]\s+|[.!?]$/
        const match = pendingSentence.match(sentenceEnd)
        if (match && match.index !== undefined) {
          const idx = match.index + match[0].length
          const sentence = pendingSentence.slice(0, idx)
          pendingSentence = pendingSentence.slice(idx)
          sentenceBuffer.push(sentence)
          // Non-blocking: fire and continue consuming stream
          flushSentence(sentence)
        }
      }

      // Flush remainder
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
    if (signal.aborted) return

    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
    if (signal.aborted) return

    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.analyser ?? this.audioContext.destination)
    this.currentSource = source

    await new Promise<void>((resolve) => {
      source.onended = () => resolve()
      source.start()
    })
  }

  onSpeechStart(callback: () => void) {
    this.speechStartCallback = callback
  }

  onSpeechEnd(callback: () => void) {
    this.speechEndCallback = callback
  }

  getAmplitude(): number {
    return this.amplitude
  }
}
