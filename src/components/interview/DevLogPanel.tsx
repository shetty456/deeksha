"use client"

import { useEffect, useRef, useState } from "react"
import { devLog, type DevEntry, type DevEntryType } from "@/lib/dev-log"

const COLOR: Record<DevEntryType, string> = {
  info:  "rgba(255,255,255,0.35)",
  req:   "rgba(100,180,255,0.85)",
  res:   "rgba(100,220,140,0.85)",
  stt:   "rgba(255,210,80,0.85)",
  tts:   "rgba(180,130,255,0.85)",
  error: "rgba(255,80,80,0.9)",
}

function ts(ms: number) {
  return (ms / 1000).toFixed(2) + "s"
}

export default function DevLogPanel() {
  const [entries, setEntries] = useState<DevEntry[]>([])
  const [open, setOpen]       = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)

  useEffect(() => devLog.subscribe(setEntries), [])

  // Auto-scroll when expanded
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "instant" })
  }, [entries, open])

  // Backtick toggles the panel
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "`") setOpen(v => !v) }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [])

  if (process.env.NODE_ENV !== "development") return null

  const last = entries[entries.length - 1]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 font-mono"
      style={{ background: "rgba(0,0,0,0.93)", borderTop: "1px solid rgba(255,255,255,0.09)" }}
    >
      {/* Toggle bar */}
      <div
        className="flex items-center gap-3 px-3 h-7 cursor-pointer select-none"
        onClick={() => setOpen(v => !v)}
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.07)" : "none" }}
      >
        <span className="text-[9px] tracking-widest uppercase shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
          DEV · {entries.length} events ·  ` to {open ? "close" : "open"}
        </span>

        {last && !open && (
          <span className="text-[10px] truncate" style={{ color: COLOR[last.type] }}>
            [{ts(last.elapsed)}] {last.label}{last.detail ? "  " + last.detail : ""}{last.duration != null ? `  (${last.duration}ms)` : ""}
          </span>
        )}
        <span className="ml-auto text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          {open ? "▼" : "▲"}
        </span>
      </div>

      {/* Log body */}
      {open && (
        <div className="overflow-y-auto" style={{ height: 220 }}>
          <table className="w-full border-collapse">
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-white/[0.02]">
                  <td className="pl-3 pr-2 py-0.5 text-[10px] tabular-nums whitespace-nowrap align-top"
                      style={{ color: "rgba(255,255,255,0.2)", width: 56 }}>
                    {ts(e.elapsed)}
                  </td>
                  <td className="pr-2 py-0.5 text-[10px] whitespace-nowrap align-top"
                      style={{ color: COLOR[e.type], width: 100 }}>
                    {e.label}
                  </td>
                  <td className="pr-3 py-0.5 text-[10px] align-top"
                      style={{ color: "rgba(255,255,255,0.45)" }}>
                    {e.detail}
                  </td>
                  <td className="pr-3 py-0.5 text-[10px] tabular-nums whitespace-nowrap align-top text-right"
                      style={{ color: "rgba(255,255,255,0.2)" }}>
                    {e.duration != null ? `${e.duration}ms` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
