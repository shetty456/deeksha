"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

type Mode = "signin" | "signup"

const FEATURES = [
  { icon: "🎙️", label: "Real-time voice interviewer" },
  { icon: "⚡", label: "Sub-second AI response" },
  { icon: "🔁", label: "Intelligent follow-up questions" },
  { icon: "📊", label: "Structured post-interview feedback" },
]

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSuccess("Account created — sign in below.")
        setMode("signin")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex">

      {/* ── Left panel: brand ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-accent flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Blurred blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <Link href="/" className="text-white font-semibold text-lg tracking-tight">
            Deeksha
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <p className="text-white/60 text-sm font-medium uppercase tracking-widest">
              PM Interview Practice
            </p>
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Practice like<br />it's the real thing.
            </h2>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              A voice-first AI interviewer that challenges your thinking, asks smart follow-ups,
              and gives you honest feedback — every session.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center text-base flex-shrink-0">
                  {f.icon}
                </span>
                <span className="text-white/85 text-sm font-medium">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-white/40 text-xs">
            © 2026 Deeksha. Built for ambitious PMs.
          </p>
        </div>
      </div>

      {/* ── Right panel: form ───────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-bg-primary">
        {/* Mobile nav */}
        <div className="lg:hidden flex items-center justify-between px-6 h-14 border-b border-separator">
          <Link href="/" className="text-base font-semibold text-label-primary tracking-tight">
            Deeksha
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-7">

            {/* Heading */}
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-label-primary">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-sm text-label-secondary">
                {mode === "signin"
                  ? "Sign in to continue your practice."
                  : "Start practicing PM interviews today."}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-label-primary">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-bg-card border border-separator rounded-md px-4 py-3 text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-label-primary">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-bg-card border border-separator rounded-md px-4 py-3 text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/8 rounded-md px-3 py-2.5">
                  <span className="mt-px">⚠</span>
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 text-xs text-accent bg-accent/8 rounded-md px-3 py-2.5">
                  <span className="mt-px">✓</span>
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-accent text-white font-semibold text-sm py-3.5 rounded-md hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 mt-1"
              >
                {loading
                  ? "Please wait…"
                  : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
              </button>
            </form>

            {/* Toggle mode */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-separator" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-bg-primary px-3 text-xs text-label-tertiary">
                  {mode === "signin" ? "New to Deeksha?" : "Already have an account?"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setSuccess(null) }}
              className="w-full border border-separator bg-bg-card text-label-primary font-medium text-sm py-3 rounded-md hover:border-accent/50 hover:text-accent transition-all"
            >
              {mode === "signin" ? "Create an account" : "Sign in instead"}
            </button>

            <p className="text-center text-xs text-label-tertiary">
              By continuing you agree to our{" "}
              <span className="underline underline-offset-2 cursor-pointer">terms</span>
              {" "}and{" "}
              <span className="underline underline-offset-2 cursor-pointer">privacy policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
