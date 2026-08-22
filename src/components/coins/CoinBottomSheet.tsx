"use client"

import { useEffect, useState } from "react"
import { COIN_PACKS, type PackId } from "@/lib/coins"
import { loadRazorpayScript } from "@/lib/razorpay-client"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
  currentBalance: number
  neededCoins: number
  onPurchaseSuccess: (coinsAdded: number) => void
}

export default function CoinBottomSheet({
  open,
  onClose,
  currentBalance,
  neededCoins,
  onPurchaseSuccess,
}: Props) {
  const [purchasing, setPurchasing] = useState<PackId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  // Drive the slide animation: mount first, then trigger enter transition
  useEffect(() => {
    if (open) {
      setVisible(true)
    } else {
      // Let the exit transition play before unmounting
      const t = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(t)
    }
  }, [open])

  async function handleBuy(packId: PackId) {
    setPurchasing(packId)
    setError(null)
    try {
      await loadRazorpayScript()

      const res = await fetch("/api/coins/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      })

      if (!res.ok) throw new Error("Failed to create order")

      const { orderId, amount, currency, keyId } = await res.json()
      const pack = COIN_PACKS.find((p) => p.id === packId)!

      const options = {
        key:         keyId,
        amount,
        currency,
        name:        "Deeksha",
        description: `${pack.coins} coins · valid 28 days`,
        order_id:    orderId,
        handler: () => {
          // Optimistically credit coins so the Start button
          // becomes active immediately without waiting for webhook
          onPurchaseSuccess(pack.coins)
          onClose()
        },
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
      setPurchasing(null)
    }
  }

  if (!visible) return null

  const shortfall = Math.max(0, neededCoins - currentBalance)

  return (
    // Backdrop
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col justify-end transition-all duration-300",
        open ? "bg-black/40 backdrop-blur-sm" : "bg-transparent pointer-events-none"
      )}
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className={cn(
          "w-full max-w-lg mx-auto bg-bg-card rounded-t-3xl transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-separator" />
        </div>

        <div className="px-6 pt-4 pb-10 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-label-primary tracking-tight">
              Top up to continue
            </h2>
            <p className="text-sm text-label-secondary">
              You need{" "}
              <span className="text-label-primary font-semibold">{shortfall} more coins</span>
              {" "}for this session. Coins are valid for 28 days.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Packs */}
          <div className="space-y-2">
            {COIN_PACKS.map((pack) => {
              const isPopular    = pack.id === "value"
              const coversNeeds  = pack.coins >= shortfall

              return (
                <button
                  key={pack.id}
                  onClick={() => handleBuy(pack.id)}
                  disabled={purchasing !== null}
                  className={cn(
                    "w-full flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all",
                    isPopular
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-separator bg-bg-primary hover:border-accent/40",
                    purchasing !== null && "opacity-50 pointer-events-none"
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-label-primary">{pack.label}</span>
                      {isPopular && (
                        <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Popular
                        </span>
                      )}
                      {coversNeeds && !isPopular && (
                        <span className="text-[10px] font-semibold text-[#30d158] bg-[#30d158]/10 px-2 py-0.5 rounded-full">
                          Covers this session
                        </span>
                      )}
                    </div>
                    <p className="text-base font-bold text-label-primary tabular-nums">
                      {pack.coins.toLocaleString("en-IN")}{" "}
                      <span className="text-xs font-normal text-label-secondary">coins</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-base font-bold text-label-primary">{pack.priceDisplay}</p>
                    {purchasing === pack.id && (
                      <p className="text-xs text-label-tertiary mt-0.5">Opening…</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-label-tertiary text-center">
            Secure payments via Razorpay · No subscription · No auto-renewal
          </p>
        </div>
      </div>
    </div>
  )
}
