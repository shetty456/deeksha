"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

type Mode = "signin" | "signup"

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

      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] bg-accent flex-col justify-center items-center p-12">
        <div className="space-y-3 text-center">
          <p className="text-white font-bold text-3xl tracking-tight">Deeksha</p>
          <p className="text-white/60 text-sm">PM interview practice, elevated.</p>
        </div>
      </div>

      {/* ── Right panel: form ──────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-bg-primary">
        {/* Mobile nav */}
        <div className="lg:hidden flex items-center px-6 h-14 border-b border-separator">
          <Link href="/" className="text-base font-semibold text-label-primary tracking-tight">
            Deeksha
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-6">

            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-label-primary">
                {mode === "signin" ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-sm text-label-secondary">
                {mode === "signin"
                  ? "Sign in to continue."
                  : "Start practicing PM interviews today."}
              </p>
            </div>

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
                <p className="text-xs text-destructive bg-destructive/8 rounded-md px-3 py-2.5">
                  ⚠ {error}
                </p>
              )}
              {success && (
                <p className="text-xs text-accent bg-accent/8 rounded-md px-3 py-2.5">
                  ✓ {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-accent text-white font-semibold text-sm py-3.5 rounded-md hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40"
              >
                {loading
                  ? "Please wait…"
                  : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-separator" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-bg-primary px-3 text-xs text-label-tertiary">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin")
                setError(null)
                setSuccess(null)
              }}
              className="w-full border border-separator bg-bg-card text-label-primary font-medium text-sm py-3 rounded-md hover:border-accent/50 hover:text-accent transition-all"
            >
              {mode === "signin" ? "Create an account" : "Sign in instead"}
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
