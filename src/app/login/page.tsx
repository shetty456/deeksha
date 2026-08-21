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
      // On success proxy redirects to /dashboard
    }

    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-bg-primary flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 h-14">
        <Link href="/" className="text-base font-semibold text-label-primary tracking-tight">
          Deeksha
        </Link>
      </nav>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-label-primary">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-sm text-label-secondary">
              {mode === "signin"
                ? "Sign in to continue practicing."
                : "Start your PM interview prep today."}
            </p>
          </div>

          {/* Form card */}
          <div className="bg-bg-card rounded-2xl border border-separator overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-label-primary"
                >
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
                  className="w-full bg-bg-primary border border-separator rounded-md px-4 py-3 text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-label-primary"
                >
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
                  className="w-full bg-bg-primary border border-separator rounded-md px-4 py-3 text-sm text-label-primary placeholder:text-label-tertiary outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Error / success */}
              {error && (
                <p className="text-xs text-destructive bg-destructive/8 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-xs text-accent bg-accent/8 rounded-md px-3 py-2">
                  {success}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-accent text-accent-foreground font-semibold text-sm py-3.5 rounded-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            {/* Divider + toggle */}
            <div className="border-t border-separator px-6 py-4 text-center">
              <p className="text-sm text-label-secondary">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin")
                    setError(null)
                    setSuccess(null)
                  }}
                  className="text-accent font-medium hover:opacity-80 transition-opacity"
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-label-tertiary px-4">
            By continuing you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}
