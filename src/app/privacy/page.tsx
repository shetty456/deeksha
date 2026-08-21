import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — Deeksha",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-bg-primary">
      <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-separator">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-base font-semibold text-label-primary tracking-tight hover:opacity-80 transition-opacity">
            Deeksha
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-label-primary">Privacy Policy</h1>
          <p className="text-sm text-label-tertiary">Last updated: August 2025</p>
        </div>

        <section className="space-y-4 text-sm text-label-secondary leading-relaxed">
          <p>
            Deeksha ("we", "us", or "our") operates this platform to help product managers
            practice interviews. This policy explains what data we collect, why, and how we
            protect it. By using Deeksha, you agree to this policy.
          </p>
        </section>

        <Section title="1. What we collect">
          <p>
            <strong className="text-label-primary">Account data.</strong> When you sign up, we
            collect your email address through Supabase Auth. We do not store passwords — login is
            handled via magic link or OAuth.
          </p>
          <p>
            <strong className="text-label-primary">Voice audio.</strong> During an interview
            session, your microphone input is captured and sent to our speech-to-text processor
            (Deepgram). The audio stream is not stored on our servers — only the resulting
            transcript is used to generate the AI response.
          </p>
          <p>
            <strong className="text-label-primary">Session data.</strong> We store metadata for
            each interview: category, difficulty, duration, transcript, and your feedback scores.
            This data is linked to your account and used to show you your history and improvement
            over time.
          </p>
          <p>
            <strong className="text-label-primary">Usage data.</strong> We log basic usage
            signals (session start/end, errors) to diagnose bugs. We do not use third-party
            analytics trackers.
          </p>
        </Section>

        <Section title="2. How we use it">
          <ul className="list-disc list-inside space-y-1">
            <li>To run your interview sessions and generate AI responses</li>
            <li>To evaluate and score your performance after each session</li>
            <li>To display your interview history in the dashboard</li>
            <li>To diagnose technical issues and improve the product</li>
          </ul>
          <p>We do not sell your data. We do not use it for advertising.</p>
        </Section>

        <Section title="3. Third-party services">
          <p>We share data with the following processors to operate the service:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-label-primary">Supabase</strong> — account auth and database storage</li>
            <li><strong className="text-label-primary">Deepgram</strong> — real-time speech-to-text transcription</li>
            <li><strong className="text-label-primary">Groq</strong> — AI language model (LLM) responses</li>
          </ul>
          <p>
            Each processor has their own privacy policy. We only share the minimum data required
            for the service to function.
          </p>
        </Section>

        <Section title="4. Data retention">
          <p>
            Your account data and session history are retained for as long as your account is
            active. Voice audio is not retained — it is streamed, transcribed, and discarded.
            Transcripts are retained as part of session records.
          </p>
          <p>
            You can request deletion of your account and all associated data at any time by
            emailing us at the address below.
          </p>
        </Section>

        <Section title="5. Security">
          <p>
            All data is transmitted over HTTPS. Session data is stored in a Supabase database
            with row-level security — you can only access your own records. We take reasonable
            precautions to protect your data, but no system is completely secure.
          </p>
        </Section>

        <Section title="6. Children">
          <p>
            Deeksha is not intended for users under 18. We do not knowingly collect data from
            minors. If you believe a minor has created an account, contact us and we will delete it.
          </p>
        </Section>

        <Section title="7. Changes to this policy">
          <p>
            We may update this policy as the product evolves. If we make material changes, we
            will notify you by email or by posting a notice in the app. Continued use after
            changes means you accept the updated policy.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>
            Questions about this policy? Email us at{" "}
            <a href="mailto:hanamshettysunil6@gmail.com" className="text-accent hover:opacity-80 transition-opacity">
              hanamshettysunil6@gmail.com
            </a>
          </p>
        </Section>
      </main>

      <footer className="border-t border-separator py-8">
        <div className="max-w-2xl mx-auto px-6 flex gap-6 text-sm text-label-tertiary">
          <Link href="/" className="hover:text-label-secondary transition-colors">Home</Link>
          <Link href="/terms" className="hover:text-label-secondary transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-label-primary">{title}</h2>
      <div className="space-y-3 text-sm text-label-secondary leading-relaxed">
        {children}
      </div>
    </section>
  )
}
