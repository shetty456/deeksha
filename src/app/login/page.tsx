"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Mode = "signin" | "signup"

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage("Account created — you can sign in now.")
        setMode("signin")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      // On success the proxy redirects to /
    }

    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Deeksha</h1>
          <p className="text-sm text-text-secondary">Real-time PM interview practice</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-text-secondary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-text-secondary transition-colors"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
            {message && <p className="text-xs text-text-secondary">{message}</p>}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-center text-xs text-text-secondary">
            {mode === "signin" ? "No account?" : "Already have one?"}{" "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null) }}
              className="text-text-primary underline underline-offset-2"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
