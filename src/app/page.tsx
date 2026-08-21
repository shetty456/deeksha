import Link from "next/link"

const FEATURES = [
  {
    icon: "🎙️",
    title: "Real-time voice conversation",
    body: "No typing. Speak and the AI responds in under a second — the same pressure as a live interview room.",
  },
  {
    icon: "⚡",
    title: "Sub-second response latency",
    body: "No awkward pauses. The interviewer begins the moment you finish — so you stay in the flow of the conversation.",
  },
  {
    icon: "🔁",
    title: "Intelligent follow-ups",
    body: "Vague answers get challenged. Strong reasoning gets pushed deeper. The AI adapts to what you actually say.",
  },
  {
    icon: "📊",
    title: "Structured feedback",
    body: "After every session, get scored across structure, product thinking, metrics, prioritization, and communication.",
  },
]

const CATEGORIES = [
  "Product Sense",
  "Product Strategy",
  "Execution",
  "Metrics",
  "Estimation",
  "Behavioral",
  "Growth",
]

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-bg-primary">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-separator">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-base font-semibold text-label-primary tracking-tight">
            Deeksha
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-accent hover:opacity-80 transition-opacity px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium bg-accent text-accent-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-bg-card border border-separator rounded-full px-4 py-1.5 text-xs font-medium text-label-secondary mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          Voice-first AI interview practice for PMs
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-label-primary leading-tight mb-6">
          Practice PM interviews
          <br />
          <span className="text-accent">like the real thing.</span>
        </h1>

        <p className="text-lg sm:text-xl text-label-secondary max-w-xl mx-auto leading-relaxed mb-10">
          A real-time AI interviewer that listens, follows up, and challenges
          your thinking — built for FAANG, Series A, and everything in between.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center bg-accent text-accent-foreground font-semibold text-base px-8 py-4 rounded-md hover:opacity-90 transition-opacity"
          >
            Start practicing free
          </Link>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-label-secondary hover:text-label-primary transition-colors"
          >
            See how it works ↓
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-bg-card rounded-2xl p-8 sm:p-12 space-y-10">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              How it works
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-label-primary">
              A real interview. No scripts.
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { step: "1", title: "Pick your interview", body: "Choose category, difficulty, and duration. Start in seconds." },
              { step: "2", title: "Talk naturally", body: "Speak into your mic. The AI listens, thinks, and responds in real time." },
              { step: "3", title: "Get feedback", body: "After the interview, see your score across every PM dimension." },
            ].map(({ step, title, body }) => (
              <div key={step} className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent font-bold text-lg flex items-center justify-center mx-auto">
                  {step}
                </div>
                <p className="font-semibold text-label-primary">{title}</p>
                <p className="text-sm text-label-secondary leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-label-primary">
            Everything the real interview tests.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-bg-card rounded-2xl p-6 border border-separator space-y-3"
            >
              <span className="text-3xl">{f.icon}</span>
              <p className="font-semibold text-label-primary">{f.title}</p>
              <p className="text-sm text-label-secondary leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-bg-card rounded-2xl p-8 sm:p-10 text-center space-y-6">
          <h2 className="text-2xl font-bold tracking-tight text-label-primary">
            7 interview types. Every question type that matters.
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <span
                key={c}
                className="bg-accent/10 text-accent text-sm font-medium px-4 py-2 rounded-md"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      {/*
        TODO: Razorpay integration
        - Create /api/billing/checkout → Razorpay order creation
        - Create /api/billing/webhook → verify payment signature, credit user's account
        - Add `credits` column to user profiles table (Supabase)
        - Deduct 1 credit per session start in /api/interview (POST)
        - Gate session creation if credits === 0
        - Dashboard: show current credit balance
        - Razorpay docs: https://razorpay.com/docs/payments/payment-gateway/
      */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-label-primary">
            Pay only for what you practice.
          </h2>
          <p className="text-sm text-label-secondary">
            Each interview session costs 1 credit — no surprises, no subscriptions that drain while you pause.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {/* Free */}
          <div className="bg-bg-card rounded-2xl p-7 border border-separator flex flex-col gap-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-label-tertiary">Free</p>
              <p className="text-3xl font-bold text-label-primary">₹0</p>
              <p className="text-xs text-label-tertiary">forever</p>
            </div>
            <ul className="space-y-2 text-sm text-label-secondary flex-1">
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>3 credits / month</li>
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>All 7 interview types</li>
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>Full feedback after each session</li>
              <li className="flex items-start gap-2"><span className="text-label-tertiary mt-0.5">–</span>Session history</li>
            </ul>
            <a
              href="/login"
              className="text-center text-sm font-semibold text-accent border border-accent rounded-md px-4 py-2.5 hover:bg-accent/10 transition-colors"
            >
              Get started
            </a>
          </div>

          {/* Starter — highlighted */}
          <div className="bg-accent rounded-2xl p-7 flex flex-col gap-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-label-primary text-bg-primary text-xs font-semibold px-3 py-1 rounded-full">
                Most popular
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground/60">Starter</p>
              <p className="text-3xl font-bold text-accent-foreground">₹399</p>
              <p className="text-xs text-accent-foreground/60">per month</p>
            </div>
            <ul className="space-y-2 text-sm text-accent-foreground/80 flex-1">
              <li className="flex items-start gap-2"><span className="text-accent-foreground mt-0.5">✓</span>20 credits / month</li>
              <li className="flex items-start gap-2"><span className="text-accent-foreground mt-0.5">✓</span>All 7 interview types</li>
              <li className="flex items-start gap-2"><span className="text-accent-foreground mt-0.5">✓</span>Full feedback after each session</li>
              <li className="flex items-start gap-2"><span className="text-accent-foreground mt-0.5">✓</span>Session history & score trends</li>
            </ul>
            <a
              href="/login"
              className="text-center text-sm font-semibold bg-accent-foreground text-accent rounded-md px-4 py-2.5 hover:opacity-90 transition-opacity"
            >
              Start Starter
            </a>
          </div>

          {/* Pro */}
          <div className="bg-bg-card rounded-2xl p-7 border border-separator flex flex-col gap-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-label-tertiary">Pro</p>
              <p className="text-3xl font-bold text-label-primary">₹999</p>
              <p className="text-xs text-label-tertiary">per month</p>
            </div>
            <ul className="space-y-2 text-sm text-label-secondary flex-1">
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>60 credits / month</li>
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>All 7 interview types</li>
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>Full feedback after each session</li>
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>Session history & score trends</li>
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>Priority response time</li>
            </ul>
            <a
              href="/login"
              className="text-center text-sm font-semibold text-accent border border-accent rounded-md px-4 py-2.5 hover:bg-accent/10 transition-colors"
            >
              Go Pro
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-label-tertiary mt-6">
          1 credit = 1 interview session · Credits reset on your billing date · Unused credits don't roll over
        </p>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-accent rounded-2xl p-10 sm:p-14 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Your next PM interview is real practice away.
          </h2>
          <p className="text-white/80 text-base">
            No account setup. No scheduling. Start a session in under 30 seconds.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center bg-white text-accent font-semibold text-base px-8 py-4 rounded-md hover:opacity-90 transition-opacity"
          >
            Start for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-separator py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-label-tertiary">
          <span className="font-semibold text-label-secondary">Deeksha</span>
          <div className="flex items-center gap-6">
            <span>Real-time AI PM interview practice</span>
            <Link href="/privacy" className="hover:text-label-secondary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-label-secondary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
