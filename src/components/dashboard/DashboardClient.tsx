"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import {
  CATEGORIES,
  DIFFICULTIES,
  DURATIONS,
  type InterviewCategory,
  type Difficulty,
  type Duration,
} from "@/lib/interview/categories"
import { cn } from "@/lib/utils"

interface RecentInterview {
  id: string
  category: string
  difficulty: string
  status: string
  overall_score: number | null
  created_at: string
}

interface Props {
  user: User
  recentInterviews: RecentInterview[]
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 8 ? "text-[#30d158] bg-[#30d158]/10"
    : score >= 6 ? "text-accent bg-accent/10"
    : "text-[#ff9f0a] bg-[#ff9f0a]/10"

  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg tabular-nums", color)}>
      {score.toFixed(1)}
    </span>
  )
}

export default function DashboardClient({ user, recentInterviews }: Props) {
  const router = useRouter()
  const [category, setCategory] = useState<InterviewCategory>("product_sense")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [duration, setDuration] = useState<Duration>(1200)
  const [starting, setStarting] = useState(false)

  const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  async function handleStart() {
    setStarting(true)
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, difficulty, duration_target: duration }),
      })
      if (!res.ok) throw new Error()
      const { id } = await res.json()
      router.push(`/interview/${id}`)
    } catch {
      setStarting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg-primary">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-separator">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-base font-semibold text-label-primary tracking-tight">Deeksha</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-label-secondary hover:text-destructive transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6 pb-16">
        {/* Greeting */}
        <div className="space-y-0.5">
          <p className="text-sm text-label-secondary">{greeting}</p>
          <h1 className="text-2xl font-bold text-label-primary tracking-tight capitalize">
            {displayName}
          </h1>
        </div>

        {/* Quick start card */}
        <div className="bg-bg-card rounded-2xl border border-separator overflow-hidden">
          <div className="px-5 pt-5 pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-label-secondary mb-4">
              New Interview
            </p>

            {/* Category */}
            <div className="space-y-2 mb-5">
              <p className="text-xs font-medium text-label-tertiary">Type</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "text-left rounded-md px-3.5 py-3 border text-sm transition-all",
                      category === cat.id
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-bg-primary border-separator text-label-primary hover:border-accent/40"
                    )}
                  >
                    <p className="font-medium leading-tight">{cat.label}</p>
                    <p className={cn(
                      "text-xs mt-0.5 leading-tight",
                      category === cat.id ? "text-white/70" : "text-label-tertiary"
                    )}>
                      {cat.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Level + Duration */}
            <div className="grid grid-cols-2 gap-5 mb-5">
              <div className="space-y-2">
                <p className="text-xs font-medium text-label-tertiary">Level</p>
                <div className="flex flex-col gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDifficulty(d.value)}
                      className={cn(
                        "rounded-md px-3.5 py-2.5 border text-sm font-medium text-left transition-all",
                        difficulty === d.value
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-bg-primary border-separator text-label-primary hover:border-accent/40"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-label-tertiary">Duration</p>
                <div className="flex flex-col gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.seconds}
                      onClick={() => setDuration(d.seconds)}
                      className={cn(
                        "rounded-md px-3.5 py-2.5 border text-sm font-medium text-left transition-all",
                        duration === d.seconds
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-bg-primary border-separator text-label-primary hover:border-accent/40"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Start button — bottom of card */}
          <div className="px-5 py-4 border-t border-separator">
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full bg-accent text-accent-foreground font-semibold text-base py-4 rounded-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {starting ? "Starting…" : "Start Interview"}
            </button>
          </div>
        </div>

        {/* Recent interviews */}
        {recentInterviews.length > 0 && (
          <div className="bg-bg-card rounded-2xl border border-separator overflow-hidden">
            <div className="px-5 pt-5 pb-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-label-secondary mb-3">
                Recent
              </p>
            </div>

            <div className="divide-y divide-separator">
              {recentInterviews.map((iv) => (
                <button
                  key={iv.id}
                  disabled={iv.status !== "completed"}
                  onClick={() =>
                    iv.status === "completed" && router.push(`/results/${iv.id}`)
                  }
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-primary/50 transition-colors disabled:cursor-default text-left"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-label-primary capitalize">
                      {iv.category.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-label-secondary capitalize">
                      {iv.difficulty} · {new Date(iv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {iv.overall_score != null ? (
                      <ScorePill score={iv.overall_score} />
                    ) : (
                      <span className="text-xs text-label-tertiary capitalize">{iv.status}</span>
                    )}
                    {iv.status === "completed" && (
                      <span className="text-label-tertiary text-sm">›</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
