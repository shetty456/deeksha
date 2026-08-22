"use client"

import { useState, useEffect, useCallback } from "react"
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
import { COIN_COST, type CoinBalance } from "@/lib/coins"
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

type Step = "home" | "category" | "difficulty" | "duration"

const STEP_ORDER: Step[] = ["category", "difficulty", "duration"]

const CATEGORY_ICONS: Record<string, string> = {
  product_sense:    "🧭",
  product_strategy: "♟️",
  execution:        "⚙️",
  metrics:          "📊",
  estimation:       "🔢",
  behavioral:       "💬",
  growth:           "🚀",
}

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 8 ? "text-[#30d158] bg-[#30d158]/10"
    : score >= 6 ? "text-accent bg-accent/10"
    : "text-[#ff9f0a] bg-[#ff9f0a]/10"
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg tabular-nums", cls)}>
      {score.toFixed(1)}
    </span>
  )
}

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEP_ORDER.map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i < current ? "w-4 bg-accent" : i === current ? "w-4 bg-accent" : "w-1.5 bg-separator"
          )}
        />
      ))}
    </div>
  )
}

function CoinChip({ balance, onBuy }: { balance: CoinBalance | null; onBuy: () => void }) {
  if (!balance) return null

  const daysLeft = balance.expiresAt
    ? Math.ceil((new Date(balance.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const isLow      = balance.total < 20
  const isExpiring = daysLeft !== null && daysLeft <= 7

  return (
    <button
      onClick={onBuy}
      className={cn(
        "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
        isLow || isExpiring
          ? "text-[#ff9f0a] border-[#ff9f0a]/40 bg-[#ff9f0a]/10"
          : "text-label-secondary border-separator bg-bg-card hover:border-accent hover:text-accent"
      )}
    >
      <span className="tabular-nums">{balance.total}</span>
      <span>coins</span>
      {isExpiring && daysLeft !== null && (
        <span className="text-[10px] opacity-70">· {daysLeft}d left</span>
      )}
      {isLow && !isExpiring && (
        <span className="text-[10px] opacity-70">· low</span>
      )}
    </button>
  )
}

export default function DashboardClient({ user, recentInterviews }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("home")
  const [category, setCategory] = useState<InterviewCategory>("product_sense")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [duration, setDuration] = useState<Duration>(600)
  const [starting, setStarting] = useState(false)
  const [coinError, setCoinError] = useState<string | null>(null)
  const [balance, setBalance] = useState<CoinBalance | null>(null)

  const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const stepIndex = STEP_ORDER.indexOf(step)

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/coins/balance")
      if (res.ok) setBalance(await res.json())
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  async function handleStart() {
    setCoinError(null)
    setStarting(true)
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, difficulty, duration_target: duration }),
      })
      if (res.status === 402) {
        const { cost } = await res.json()
        setCoinError(`You need ${cost} coins for this session. You have ${balance?.total ?? 0}.`)
        setStep("duration")
        return
      }
      if (!res.ok) throw new Error()
      const { id } = await res.json()
      router.push(`/interview/${id}`)
    } catch {
      setStarting(false)
    }
  }

  function goBack() {
    setCoinError(null)
    if (step === "category") setStep("home")
    else if (step === "difficulty") setStep("category")
    else if (step === "duration") setStep("difficulty")
  }

  const sessionCost    = COIN_COST[duration]
  const canAfford      = balance !== null && balance.total >= sessionCost
  const hasAnyCoins    = balance === null || balance.total >= 10  // min cost for 5-min session

  // ── Home ────────────────────────────────────────────────
  if (step === "home") {
    return (
      <div className="min-h-dvh bg-bg-primary flex flex-col">
        <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-separator">
          <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
            <span className="text-base font-semibold text-label-primary tracking-tight">Deeksha</span>
            <div className="flex items-center gap-3">
              <CoinChip balance={balance} onBuy={() => router.push("/pricing")} />
              <button onClick={handleSignOut} className="text-sm text-label-secondary hover:text-destructive transition-colors">
                Sign out
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-lg mx-auto w-full px-6 py-10 space-y-8 flex-1">
          <div className="space-y-0.5">
            <p className="text-sm text-label-secondary">{greeting}</p>
            <h1 className="text-2xl font-bold text-label-primary tracking-tight capitalize">{displayName}</h1>
          </div>

          {/* Coin expiry warning */}
          {balance && balance.expiresAt && (() => {
            const daysLeft = Math.ceil((new Date(balance.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            if (daysLeft > 7) return null
            return (
              <div className="bg-[#ff9f0a]/10 rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
                <p className="text-sm text-[#ff9f0a] font-medium">
                  Your {balance.total} coins expire in {daysLeft} day{daysLeft !== 1 ? "s" : ""}. Use them or top up.
                </p>
                <button
                  onClick={() => router.push("/pricing")}
                  className="text-xs font-semibold text-[#ff9f0a] border border-[#ff9f0a]/50 px-3 py-1.5 rounded-lg hover:bg-[#ff9f0a]/10 transition-colors flex-shrink-0"
                >
                  Top up
                </button>
              </div>
            )
          })()}

          {/* Start CTA */}
          <div className="bg-accent rounded-2xl p-6 space-y-4">
            <div className="space-y-1">
              {hasAnyCoins ? (
                <>
                  <p className="text-white font-semibold text-lg">Ready to practice?</p>
                  <p className="text-white/70 text-sm">Pick a type, level, and duration — takes 10 seconds.</p>
                </>
              ) : (
                <>
                  <p className="text-white font-semibold text-lg">You&apos;re out of coins</p>
                  <p className="text-white/70 text-sm">Top up to start your next interview session.</p>
                </>
              )}
            </div>
            {hasAnyCoins ? (
              <button
                onClick={() => setStep("category")}
                className="bg-white text-accent font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity"
              >
                Start Interview →
              </button>
            ) : (
              <button
                onClick={() => router.push("/pricing")}
                className="bg-white text-accent font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity"
              >
                Buy Coins →
              </button>
            )}
          </div>

          {/* Recent */}
          {recentInterviews.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-label-secondary">Recent</p>
              <div className="bg-bg-card rounded-2xl border border-separator divide-y divide-separator overflow-hidden">
                {recentInterviews.map((iv) => (
                  <button
                    key={iv.id}
                    disabled={iv.status !== "completed"}
                    onClick={() => iv.status === "completed" && router.push(`/results/${iv.id}`)}
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
                      {iv.overall_score != null
                        ? <ScorePill score={iv.overall_score} />
                        : <span className="text-xs text-label-tertiary capitalize">{iv.status}</span>}
                      {iv.status === "completed" && <span className="text-label-tertiary">›</span>}
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

  // ── Step shell (category / difficulty / duration) ────────
  return (
    <div className="min-h-dvh bg-bg-primary flex flex-col">
      {/* Step nav */}
      <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-separator">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={goBack}
            className="text-sm text-label-secondary hover:text-label-primary transition-colors flex items-center gap-1.5"
          >
            ← {step === "category" ? "Home" : "Back"}
          </button>
          <ProgressDots current={stepIndex} />
          <CoinChip balance={balance} onBuy={() => router.push("/pricing")} />
        </div>
      </nav>

      <div className="max-w-lg mx-auto w-full px-6 flex flex-col flex-1 py-10">

        {/* ── Step 1: Category ── */}
        {step === "category" && (
          <div className="flex flex-col flex-1 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-label-primary">What would you like to practice?</h2>
              <p className="text-sm text-label-secondary">Choose one area to focus on.</p>
            </div>

            <div className="grid grid-cols-1 gap-2 flex-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all",
                    category === cat.id
                      ? "border-accent bg-accent/8 ring-1 ring-accent"
                      : "border-separator bg-bg-card hover:border-accent/40"
                  )}
                >
                  <span className="text-xl w-7 flex-shrink-0 text-center">{CATEGORY_ICONS[cat.id]}</span>
                  <div>
                    <p className={cn("text-sm font-medium", category === cat.id ? "text-accent" : "text-label-primary")}>
                      {cat.label}
                    </p>
                    <p className="text-xs text-label-secondary mt-0.5">{cat.description}</p>
                  </div>
                  {category === cat.id && (
                    <span className="ml-auto text-accent text-base">✓</span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("difficulty")}
              className="w-full bg-accent text-white font-semibold text-sm py-3.5 rounded-md hover:opacity-90 transition-opacity"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2: Difficulty ── */}
        {step === "difficulty" && (
          <div className="flex flex-col flex-1 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-label-primary">How challenging?</h2>
              <p className="text-sm text-label-secondary">We'll pick questions that match your level.</p>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-5 py-5 text-left transition-all",
                    difficulty === d.value
                      ? "border-accent bg-accent/8 ring-1 ring-accent"
                      : "border-separator bg-bg-card hover:border-accent/40"
                  )}
                >
                  <div>
                    <p className={cn("text-base font-semibold", difficulty === d.value ? "text-accent" : "text-label-primary")}>
                      {d.label}
                    </p>
                    <p className="text-xs text-label-secondary mt-0.5">
                      {d.value === "easy" && "New grad to 2 years experience"}
                      {d.value === "medium" && "2–5 years, mid-level PM"}
                      {d.value === "hard" && "Senior, Staff, or Principal PM"}
                    </p>
                  </div>
                  {difficulty === d.value && <span className="text-accent text-base ml-4">✓</span>}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("duration")}
              className="w-full bg-accent text-white font-semibold text-sm py-3.5 rounded-md hover:opacity-90 transition-opacity"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 3: Duration ── */}
        {step === "duration" && (
          <div className="flex flex-col flex-1 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-label-primary">How much time do you have?</h2>
              <p className="text-sm text-label-secondary">The interviewer will wrap up within your window.</p>
            </div>

            {coinError && (
              <div className="bg-destructive/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-sm text-destructive">{coinError}</p>
                <button
                  onClick={() => router.push("/pricing")}
                  className="text-xs font-semibold text-destructive border border-destructive/40 px-3 py-1.5 rounded-lg flex-shrink-0"
                >
                  Buy coins
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3 flex-1">
              {DURATIONS.map((d) => {
                const cost = COIN_COST[d.seconds]
                const affordable = balance === null || balance.total >= cost
                return (
                  <button
                    key={d.seconds}
                    onClick={() => { setDuration(d.seconds); setCoinError(null) }}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-5 py-5 text-left transition-all",
                      duration === d.seconds
                        ? "border-accent bg-accent/8 ring-1 ring-accent"
                        : "border-separator bg-bg-card hover:border-accent/40",
                      !affordable && "opacity-50"
                    )}
                  >
                    <div>
                      <p className={cn("text-base font-semibold", duration === d.seconds ? "text-accent" : "text-label-primary")}>
                        {d.label}
                      </p>
                      <p className="text-xs text-label-secondary mt-0.5">
                        {d.seconds === 300  && "Quick sprint, tight back-and-forth"}
                        {d.seconds === 600  && "Focused session, good depth"}
                        {d.seconds === 1200 && "Standard interview length"}
                        {d.seconds === 1800 && "Full deep-dive, senior-level pace"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs font-semibold tabular-nums px-2 py-1 rounded-md",
                        affordable ? "text-label-secondary bg-bg-primary" : "text-destructive bg-destructive/10"
                      )}>
                        {cost} coins
                      </span>
                      {duration === d.seconds && <span className="text-accent text-base">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="space-y-3">
              {balance !== null && !canAfford && (
                <p className="text-xs text-label-tertiary text-center">
                  You need {sessionCost} coins for this session.{" "}
                  <button onClick={() => router.push("/pricing")} className="text-accent underline">
                    Buy more coins →
                  </button>
                </p>
              )}
              <button
                onClick={handleStart}
                disabled={starting || !canAfford}
                className="w-full bg-accent text-white font-semibold text-sm py-3.5 rounded-md hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {starting ? "Starting…" : canAfford ? `Start Interview · ${sessionCost} coins` : "Insufficient coins"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
