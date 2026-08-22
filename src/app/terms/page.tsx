import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service — Deeksha",
}

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold tracking-tight text-label-primary">Terms of Service</h1>
          <p className="text-sm text-label-tertiary">Last updated: August 2025</p>
        </div>

        <section className="space-y-4 text-sm text-label-secondary leading-relaxed">
          <p>
            These terms govern your use of Deeksha. By creating an account or using the
            service, you agree to be bound by them. Please read them before using the product.
          </p>
        </section>

        <Section title="1. The service">
          <p>
            Deeksha provides a real-time AI-powered interview practice platform for product
            managers. The service includes voice-based mock interviews, performance evaluation,
            and session history. We may change, add, or remove features at any time.
          </p>
        </Section>

        <Section title="2. Your account">
          <p>
            You must provide an accurate email address to create an account. You are responsible
            for all activity that occurs under your account. Do not share your login credentials.
            If you suspect unauthorized access, contact us immediately.
          </p>
          <p>
            You must be at least 18 years old to use Deeksha.
          </p>
        </Section>

        <Section title="3. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Attempt to reverse-engineer, scrape, or copy our AI models or question bank</li>
            <li>Use the service for any unlawful purpose</li>
            <li>Impersonate any person or entity</li>
            <li>Interfere with the security or integrity of the platform</li>
            <li>Use automated tools to interact with the service</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </Section>

        <Section title="4. Coins and billing">
          <p>
            Deeksha uses a coin-based system. Coins are deducted when you start an interview
            session. New accounts receive 30 free coins on sign-up (enough for one 30-minute
            session). Additional coins can be purchased in packs via Razorpay.
          </p>
          <p>
            Session costs: 5 minutes costs 10 coins, 10 minutes costs 20 coins, 20 minutes
            costs 40 coins, and 30 minutes costs 60 coins.
          </p>
          <p>
            <strong>All coins expire 28 days from the date they were granted or purchased.</strong>{" "}
            This applies to free sign-up coins and purchased packs equally. Unused coins are
            forfeited after expiry — no refunds or rollovers are provided. We will send an
            email reminder 3 days before your coins expire.
          </p>
          <p>
            Payments are processed securely by Razorpay. Deeksha does not store your card
            details. All purchases are final; refunds are not provided for coin packs once
            payment is confirmed. There is no auto-renewal — each purchase is a one-time
            transaction.
          </p>
        </Section>

        <Section title="5. Intellectual property">
          <p>
            All content, software, and AI models on this platform belong to Deeksha or its
            licensors. We grant you a limited, non-transferable license to use the service for
            personal interview preparation. You may not reproduce or distribute any part of
            the service without our written permission.
          </p>
          <p>
            You retain ownership of any content you submit (e.g., your voice responses). By
            using the service, you grant us a limited license to process that content to
            operate the service.
          </p>
        </Section>

        <Section title="6. No guarantee of outcomes">
          <p>
            Deeksha is a practice tool. We make no guarantee that using the service will
            result in interview success, job offers, or any particular performance outcome.
            Interview results depend on many factors beyond our control.
          </p>
        </Section>

        <Section title="7. Disclaimer of warranties">
          <p>
            The service is provided "as is" without warranties of any kind, express or
            implied. We do not warrant that the service will be uninterrupted, error-free,
            or that any defects will be corrected.
          </p>
        </Section>

        <Section title="8. Limitation of liability">
          <p>
            To the maximum extent permitted by law, Deeksha shall not be liable for any
            indirect, incidental, special, or consequential damages arising from your use of
            the service. Our total liability to you shall not exceed the amount you paid us in
            the 3 months before the claim.
          </p>
        </Section>

        <Section title="9. Governing law">
          <p>
            These terms are governed by the laws of India. Any disputes shall be subject to
            the exclusive jurisdiction of the courts in Bengaluru, Karnataka.
          </p>
        </Section>

        <Section title="10. Changes to these terms">
          <p>
            We may update these terms from time to time. We will notify you of material changes
            by email or in-app notice. Continued use of the service after changes constitutes
            acceptance.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions about these terms? Email us at{" "}
            <a href="mailto:hanamshettysunil6@gmail.com" className="text-accent hover:opacity-80 transition-opacity">
              hanamshettysunil6@gmail.com
            </a>
          </p>
        </Section>
      </main>

      <footer className="border-t border-separator py-8">
        <div className="max-w-2xl mx-auto px-6 flex gap-6 text-sm text-label-tertiary">
          <Link href="/" className="hover:text-label-secondary transition-colors">Home</Link>
          <Link href="/privacy" className="hover:text-label-secondary transition-colors">Privacy</Link>
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
