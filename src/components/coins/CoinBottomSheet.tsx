"use client"

import { useEffect, useState, useMemo } from "react"
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
  const shortfall = Math.max(0, neededCoins - currentBalance)

  // Smallest pack that covers the shortfall — pre-selected for the user
  const recommendedPack = useMemo(
    () => COIN_PACKS.find((p) => p.coins >= shortfall) ?? COIN_PACKS[0],
    [shortfall]
  )

  const [selectedPackId, setSelectedPackId] = useState<PackId>(recommendedPack.id)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  const selectedPack = COIN_PACKS.find((p) => p.id === selectedPackId)!

  useEffect(() => {
    if (open) {
      setVisible(true)
      setSelectedPackId(recommendedPack.id)
      setError(null)
      setPurchasing(false)
    } else {
      const t = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(t)
    }
  }, [open, recommendedPack.id])

  async function handlePay() {
    setPurchasing(true)
    setError(null)
    try {
      await loadRazorpayScript()

      const res = await fetch("/api/coins/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: selectedPackId }),
      })

      if (!res.ok) throw new Error("Failed to create order")

      const { orderId, amount, currency, keyId } = await res.json()

      const options = {
        key:         keyId,
        amount,
        currency,
        name:        "Deeksha",
        description: `${selectedPack.coins} coins · valid 28 days`,
        order_id:    orderId,
        handler: () => {
          onPurchaseSuccess(selectedPack.coins)
          onClose()
        },
        theme: { color: "#0a84ff" },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options)
      rzp.on("payment.failed", () => {
        setError("Payment failed. Please try again.")
        setPurchasing(false)
      })
      rzp.open()
    } catch {
      setError("Something went wrong. Please try again.")
      setPurchasing(false)
    }
  }

  if (!visible) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col justify-end transition-all duration-300",
        open ? "bg-black/40 backdrop-blur-sm" : "bg-transparent pointer-events-none"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg mx-auto bg-bg-card rounded-t-3xl transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-separator" />
        </div>

        <div className="px-6 pt-4 pb-8 space-y-5">

          {/* Header — direct, no jargon */}
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-label-primary tracking-tight">
              You need {shortfall} more coins
            </h2>
            <p className="text-sm text-label-secondary">
              Pick a pack to unlock this session.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Pack selection — radio pattern, selecting ≠ paying */}
          <div className="space-y-2">
            {COIN_PACKS.map((pack) => {
              const isSelected     = pack.id === selectedPackId
              const isRecommended  = pack.id === recommendedPack.id
              // How many sessions like this one does this pack unlock?
              const sessions = Math.floor(pack.coins / neededCoins)

              return (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className={cn(
                    "w-full flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all",
                    isSelected
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-separator bg-bg-primary hover:border-accent/30"
                  )}
                >
                  {/* Radio indicator */}
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    isSelected ? "border-accent" : "border-separator"
                  )}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                    )}
                  </div>

                  {/* Pack info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-sm font-semibold",
                        isSelected ? "text-accent" : "text-label-primary"
                      )}>
                        {pack.coins.toLocaleString("en-IN")} coins
                      </span>
                      {isRecommended && (
                        <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    {/* Sessions in their language, not coin-speak */}
                    <p className="text-xs text-label-secondary mt-0.5">
                      {sessions >= 1
                        ? `${sessions} session${sessions !== 1 ? "s" : ""} like this`
                        : "Covers this session"}
                    </p>
                  </div>

                  {/* Price — right-aligned, always visible */}
                  <span className={cn(
                    "text-base font-bold flex-shrink-0",
                    isSelected ? "text-label-primary" : "text-label-secondary"
                  )}>
                    {pack.priceDisplay}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Single CTA — the only colored element, price updates with selection */}
          <div className="space-y-2">
            <button
              onClick={handlePay}
              disabled={purchasing}
              className="w-full bg-accent text-white font-semibold text-sm py-3.5 rounded-md hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {purchasing ? "Opening payment…" : `Pay ${selectedPack.priceDisplay} →`}
            </button>
            {/* Trust + expiry — below the CTA, not above it */}
            <p className="text-xs text-label-tertiary text-center">
              28-day validity · No subscription · No auto-renewal
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
