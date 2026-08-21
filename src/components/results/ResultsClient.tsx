"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Evaluation {
  overall_score: number
  communication_score: number
  structure_score: number
  product_thinking_score: number
  analytical_thinking_score: number
  prioritization_score: number
  metrics_score: number
  strengths: string[]
  weaknesses: string[]
  missed_opportunities: string[]
  recommendations: string[]
  summary: string
}

interface Interview {
  id: string
  category: string
  difficulty: string
  created_at: string
}

interface Turn {
  speaker: string
  text: string
  sequence: number
}

interface Props {
  interview: Interview
  evaluation: Evaluation | null
  transcript: Turn[]
}

const DIMENSIONS = [
  { key: "structure_score" as const, label: "Structure" },
  { key: "product_thinking_score" as const, label: "Product Thinking" },
  { key: "communication_score" as const, label: "Communication" },
  { key: "metrics_score" as const, label: "Metrics" },
  { key: "prioritization_score" as const, label: "Prioritization" },
  { key: "analytical_thinking_score" as const, label: "Analytical Thinking" },
]

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-700"
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <span className="text-sm font-medium text-text-primary tabular-nums w-6 text-right">
        {score.toFixed(0)}
      </span>
    </div>
  )
}

export default function ResultsClient({ interview, evaluation, transcript }: Props) {
  const router = useRouter()
  const [showTranscript, setShowTranscript] = useState(false)

  const categoryLabel = interview.category.replace(/_/g, " ")

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-border">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Home
        </button>
        <span className="text-sm font-semibold text-text-primary">Deeksha</span>
        <div />
      </header>

      <main className="max-w-lg mx-auto px-6 py-12 space-y-10">
        {/* Title */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
            Interview Complete
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary capitalize">
            {categoryLabel}
          </h1>
          <p className="text-sm text-text-secondary capitalize">
            {interview.difficulty} · {new Date(interview.created_at).toLocaleDateString()}
          </p>
        </div>

        {!evaluation ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-3">
            <p className="text-sm text-text-secondary">Generating your evaluation…</p>
            <p className="text-xs text-text-tertiary">This may take a moment.</p>
          </div>
        ) : (
          <>
            {/* Overall score */}
            <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-2">
              <p className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
                Overall
              </p>
              <p className="text-6xl font-semibold tracking-tight text-text-primary tabular-nums">
                {evaluation.overall_score.toFixed(1)}
              </p>
              <p className="text-sm text-text-secondary">out of 10</p>
            </div>

            {/* Dimension scores */}
            <section className="space-y-4">
              {DIMENSIONS.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">{label}</span>
                  </div>
                  <ScoreBar score={evaluation[key]} />
                </div>
              ))}
            </section>

            {/* Summary */}
            {evaluation.summary && (
              <section className="space-y-2">
                <h2 className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
                  Summary
                </h2>
                <p className="text-sm text-text-primary leading-relaxed">{evaluation.summary}</p>
              </section>
            )}

            {/* Strengths */}
            {evaluation.strengths.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
                  What you did well
                </h2>
                <ul className="space-y-2">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-text-primary">
                      <span className="text-text-tertiary mt-0.5">·</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Weaknesses */}
            {evaluation.weaknesses.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
                  What held you back
                </h2>
                <ul className="space-y-2">
                  {evaluation.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-3 text-sm text-text-primary">
                      <span className="text-text-tertiary mt-0.5">·</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Recommendations */}
            {evaluation.recommendations.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
                  What to practice next
                </h2>
                <ul className="space-y-2">
                  {evaluation.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm text-text-primary">
                      <span className="text-text-tertiary mt-0.5">·</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Transcript toggle */}
            {transcript.length > 0 && (
              <section className="space-y-3 pt-4 border-t border-border">
                <button
                  onClick={() => setShowTranscript((v) => !v)}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showTranscript ? "Hide transcript" : "View transcript"}
                </button>

                {showTranscript && (
                  <div className="space-y-4 pt-2">
                    {transcript.map((turn) => (
                      <div key={turn.sequence} className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                          {turn.speaker}
                        </p>
                        <p className="text-sm text-text-primary leading-relaxed">{turn.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* CTA */}
        <button
          onClick={() => router.push("/")}
          className="w-full rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
        >
          Practice Again
        </button>
      </main>
    </div>
  )
}
