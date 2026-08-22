"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { COIN_PACKS, COIN_COST } from "@/lib/coins"
import { cn } from "@/lib/utils"

const SESSION_COSTS = [
  { label: "5 min",  seconds: 300,  coins: COIN_COST[300]  },
  { label: "10 min", seconds: 600,  coins: COIN_COST[600]  },
  { label: "20 min", seconds: 1200, coins: COIN_COST[1200] },
  { label: "30 min", seconds: 1800, coins: COIN_COST[1800] },
]

export default function PricingPage() {
  const router = useRouter()
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy(packId: string) {
    setPurchasing(packId)
    setError(null)
    try {
      // Create Razorpay order
      const res = await fetch("/api/coins/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      })

      if (res.status === 401) {
        router.push("/login")
        return
      }

      if (!res.ok) throw new Error("Failed to create order")

      const { orderId, amount, currency, keyId } = await res.json()

      // Open Razorpay checkout
      const options = {
        key:      keyId,
        amount,
        currency,
        name:     "Deeksha",
        description: `${COIN_PACKS.find((p) => p.id === packId)?.coins} coins · valid 28 days`,
        order_id: orderId,
        handler: () => {
          // Payment captured — webhook credits coins server-side
          // Redirect to dashboard after a short delay for webhook to process
          setTimeout(() => router.push("/dashboard?purchased=1"), 1500)
        },
        prefill: {},
        theme: { color: "#0a84ff" },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options)
      rzp.on("payment.failed", () => {
        setError("Payment failed. Please try again.")
        setPurchasing(null)
      })
      rzp.open()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />

      <div className="min-h-dvh bg-bg-primary">
        <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-separator">
          <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="text-sm text-label-secondary hover:text-label-primary transition-colors"
            >
              ← Back
            </button>
            <span className="text-base font-semibold text-label-primary tracking-tight">Buy Coins</span>
            <div className="w-12" />
          </div>
        </nav>

        <main className="max-w-lg mx-auto px-6 py-10 space-y-10">

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-label-primary tracking-tight">
              Practice on your terms
            </h1>
            <p className="text-sm text-label-secondary leading-relaxed">
              Buy coins and use them whenever you like. Coins are valid for{" "}
              <span className="text-label-primary font-medium">28 days</span> from purchase.
            </p>
          </div>

          {/* Session cost reference */}
          <div className="bg-bg-card rounded-2xl border border-separator p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-label-secondary">
              Session cost
            </p>
            <div className="grid grid-cols-4 gap-2">
              {SESSION_COSTS.map((s) => (
                <div key={s.seconds} className="text-center">
                  <p className="text-base font-semibold text-label-primary tabular-nums">{s.coins}</p>
                  <p className="text-xs text-label-secondary mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-label-tertiary">coins per session · 1 coin = ₹1</p>
          </div>

          {/* Coin packs */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-label-secondary">
              Coin packs
            </p>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{error}</p>
            )}

            <div className="space-y-2">
              {COIN_PACKS.map((pack) => {
                const isPopular = pack.id === "value"
                return (
                  <div
                    key={pack.id}
                    className={cn(
                      "bg-bg-card rounded-2xl border p-5 flex items-center justify-between",
                      isPopular ? "border-accent ring-1 ring-accent" : "border-separator"
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-label-primary">{pack.label}</p>
                        {isPopular && (
                          <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xl font-bold text-label-primary tabular-nums">
                        {pack.coins.toLocaleString("en-IN")}{" "}
                        <span className="text-sm font-normal text-label-secondary">coins</span>
                      </p>
                      <p className="text-xs text-label-tertiary">Valid 28 days from purchase</p>
                    </div>
                    <div className="text-right space-y-2 flex-shrink-0 ml-4">
                      <p className="text-lg font-bold text-label-primary">{pack.priceDisplay}</p>
                      <button
                        onClick={() => handleBuy(pack.id)}
                        disabled={purchasing !== null}
                        className={cn(
                          "text-sm font-semibold px-4 py-2 rounded-lg transition-all",
                          isPopular
                            ? "bg-accent text-white hover:opacity-90"
                            : "bg-bg-primary border border-separator text-label-primary hover:border-accent hover:text-accent",
                          purchasing !== null && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {purchasing === pack.id ? "Opening…" : "Buy"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Expiry policy note */}
          <div className="bg-[#ff9f0a]/10 rounded-2xl p-4 space-y-1">
            <p className="text-sm font-semibold text-[#ff9f0a]">Coins expire after 28 days</p>
            <p className="text-xs text-label-secondary leading-relaxed">
              Purchased coins are valid for 28 days from the date of purchase.
              Unused coins are forfeited after that. We&apos;ll remind you 3 days before they expire.
            </p>
          </div>

          {/* Footer note */}
          <p className="text-xs text-label-tertiary text-center">
            Secure payments via Razorpay · INR only · No subscription, no auto-renewal
          </p>

        </main>
      </div>
    </>
  )
}
