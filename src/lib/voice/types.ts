export type AudioState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "reconnecting"
  | "ended"
  | "error"

export interface SpeechRecognizer {
  connect(): Promise<void>
  disconnect(): void
  startListening(): void
  stopListening(): void
  mute(): void
  unmute(): void
  onPartialTranscript(callback: (text: string) => void): void
  onFinalTranscript(callback: (text: string) => void): void
  onSpeechStarted(callback: () => void): void
  onSpeechEnded(callback: () => void): void
  onError(callback: (error: Error) => void): void
}

export interface SpeechSynthesizer {
  connect(): Promise<void>
  disconnect(): void
  speak(textStream: AsyncIterable<string>): Promise<void>
  interrupt(): void
  onSpeechStart(callback: () => void): void
  onSpeechEnd(callback: () => void): void
  getAmplitude(): number
}
