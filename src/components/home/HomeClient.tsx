"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { CATEGORIES, DIFFICULTIES, DURATIONS, type InterviewCategory, type Difficulty, type Duration } from "@/lib/interview/categories"
import { cn } from "@/lib/utils"

interface RecentInterview {
  id: string
  category: string
  difficulty: string
  status: string
  overall_score: number | null
  created_at: string
  ended_at: string | null
}

interface Props {
  user: User
  recentInterviews: RecentInterview[]
}

export default function HomeClient({ user, recentInterviews }: Props) {
  const router = useRouter()
  const [category, setCategory] = useState<InterviewCategory>("product_sense")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [duration, setDuration] = useState<Duration>(1200)
  const [starting, setStarting] = useState(false)

  async function handleStart() {
    setStarting(true)
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, difficulty, duration_target: duration }),
      })
      if (!res.ok) throw new Error("Failed to create interview")
      const { id } = await res.json()
      router.push(`/interview/${id}`)
    } catch {
      setStarting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-border">
        <span className="text-base font-semibold tracking-tight text-text-primary">Deeksha</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">{user.email}</span>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-12 space-y-10">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Practice PM Interviews
          </h1>
          <p className="text-sm text-text-secondary">
            Choose your interview type and start talking.
          </p>
        </div>

        {/* Category */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
            Interview Type
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-start gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors",
                  category === cat.id
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-surface hover:border-text-secondary"
                )}
              >
                <div>
                  <p className={cn(
                    "text-sm font-medium",
                    category === cat.id ? "text-accent-foreground" : "text-text-primary"
                  )}>
                    {cat.label}
                  </p>
                  <p className={cn(
                    "text-xs mt-0.5",
                    category === cat.id ? "text-accent-foreground/70" : "text-text-secondary"
                  )}>
                    {cat.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Difficulty + Duration */}
        <div className="grid grid-cols-2 gap-6">
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
              Level
            </h2>
            <div className="space-y-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-sm font-medium text-left transition-colors",
                    difficulty === d.value
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-surface text-text-primary hover:border-text-secondary"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
              Duration
            </h2>
            <div className="space-y-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.seconds}
                  onClick={() => setDuration(d.seconds)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-sm font-medium text-left transition-colors",
                    duration === d.seconds
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-surface text-text-primary hover:border-text-secondary"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Start */}
        <div className="space-y-2">
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full rounded-md bg-accent px-6 py-4 text-base font-semibold text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {starting ? "Starting…" : "Start Interview"}
          </button>
          <p className="text-xs text-center text-text-tertiary">
            Microphone access required — your browser will ask when the session starts.
          </p>
        </div>

        {/* Recent interviews */}
        {recentInterviews.length > 0 && (
          <section className="space-y-3 pt-4 border-t border-border">
            <h2 className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
              Recent
            </h2>
            <div className="space-y-2">
              {recentInterviews.map((interview) => (
                <button
                  key={interview.id}
                  onClick={() =>
                    interview.status === "completed"
                      ? router.push(`/results/${interview.id}`)
                      : null
                  }
                  disabled={interview.status !== "completed"}
                  title={interview.status !== "completed" ? "Feedback not ready yet" : undefined}
                  className="w-full flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left hover:border-text-secondary transition-colors disabled:cursor-default disabled:opacity-60"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {interview.category.replace("_", " ")}
                    </p>
                    <p className="text-xs text-text-secondary capitalize">
                      {interview.difficulty} · {new Date(interview.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {interview.overall_score != null ? (
                      <p className="text-sm font-semibold text-text-primary">
                        {interview.overall_score.toFixed(1)}<span className="text-xs font-normal text-text-secondary">/10</span>
                      </p>
                    ) : (
                      <p className="text-xs text-text-secondary">{interview.status.replace(/_/g, " ")}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
