export type DevEntryType = "info" | "req" | "res" | "stt" | "tts" | "error"

export interface DevEntry {
  id: number
  elapsed: number      // ms since reset()
  type: DevEntryType
  label: string
  detail?: string
  duration?: number    // ms, for timed pairs
}

type Listener = (entries: DevEntry[]) => void

class DevLogStore {
  entries: DevEntry[] = []
  private listeners = new Set<Listener>()
  private counter = 0
  private origin = 0

  reset() {
    this.entries = []
    this.counter = 0
    this.origin = Date.now()
    this.notify()
  }

  push(type: DevEntryType, label: string, detail?: string, duration?: number): void {
    if (process.env.NODE_ENV !== "development") return
    this.entries = [
      ...this.entries,
      { id: this.counter++, elapsed: Date.now() - this.origin, type, label, detail, duration },
    ]
    this.notify()
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.entries)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.entries))
  }
}

export const devLog = new DevLogStore()
