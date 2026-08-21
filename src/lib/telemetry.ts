export type TelemetryEvent =
  | "interview_started"
  | "microphone_connected"
  | "stt_connected"
  | "user_turn_started"
  | "user_turn_ended"
  | "llm_started"
  | "llm_first_token"
  | "tts_started"
  | "tts_first_audio"
  | "ai_interrupted"
  | "interview_completed"
  | "evaluation_started"
  | "evaluation_completed"

interface TelemetryRecord {
  event: TelemetryEvent
  timestamp: number
  metadata?: Record<string, string | number>
}

const STORAGE_KEY = "deeksha_telemetry"

export function logEvent(
  event: TelemetryEvent,
  metadata?: Record<string, string | number>
): void {
  const record: TelemetryRecord = {
    event,
    timestamp: Date.now(),
    metadata,
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[telemetry] ${event}`, metadata ?? "")
  }

  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as TelemetryRecord[]
    existing.push(record)
    // Keep last 200 events
    if (existing.length > 200) existing.splice(0, existing.length - 200)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // localStorage unavailable
  }
}

export function getLatencyMs(from: TelemetryEvent, to: TelemetryEvent): number | null {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as TelemetryRecord[]
    const fromRecord = [...records].reverse().find((r) => r.event === from)
    const toRecord = [...records].reverse().find((r) => r.event === to)

    if (!fromRecord || !toRecord) return null
    return toRecord.timestamp - fromRecord.timestamp
  } catch {
    return null
  }
}
