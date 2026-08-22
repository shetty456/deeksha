import type { SupabaseClient } from "@supabase/supabase-js"

// Coin cost per session duration (seconds → coins)
export const COIN_COST: Record<number, number> = {
  300:  10,
  600:  20,
  1200: 40,
  1800: 60,
}

// Coin packs available for purchase
export const COIN_PACKS = [
  { id: "starter", label: "Starter",  coins: 100,  price: 99,   priceDisplay: "₹99"   },
  { id: "value",   label: "Value",    coins: 300,  price: 279,  priceDisplay: "₹279"  },
  { id: "power",   label: "Power",    coins: 700,  price: 599,  priceDisplay: "₹599"  },
  { id: "elite",   label: "Elite",    coins: 1500, price: 1199, priceDisplay: "₹1,199" },
] as const

export type PackId = (typeof COIN_PACKS)[number]["id"]

export interface CoinBalance {
  total: number
  // earliest expiry across all active batches (the balance "expires" here if you don't top up)
  expiresAt: string | null
}

// Returns the user's spendable coin balance (excludes expired credits)
// and the earliest expiry date across active positive batches.
export async function getCoinBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<CoinBalance> {
  const now = new Date().toISOString()

  // Sum all non-expired ledger rows for this user
  const { data, error } = await supabase
    .from("coin_ledger")
    .select("amount, expires_at")
    .eq("user_id", userId)
    .or(`expires_at.gt.${now},expires_at.is.null`)

  if (error || !data) return { total: 0, expiresAt: null }

  const total = data.reduce((sum, row) => sum + row.amount, 0)

  // Find the earliest expiry among positive (credit) rows
  const creditExpiries = data
    .filter((r) => r.amount > 0 && r.expires_at)
    .map((r) => r.expires_at as string)
    .sort()

  return {
    total: Math.max(0, total),
    expiresAt: creditExpiries[0] ?? null,
  }
}

// Deducts `cost` coins from the user's balance using FIFO by expires_at.
// Returns true if successful, false if insufficient balance.
// Must be called with the service-role client (bypasses RLS).
export async function deductCoins(
  supabase: SupabaseClient,
  userId: string,
  cost: number,
  interviewId: string
): Promise<boolean> {
  const now = new Date().toISOString()

  // Fetch all active positive ledger rows ordered by soonest expiry first
  const { data: credits } = await supabase
    .from("coin_ledger")
    .select("id, amount, expires_at")
    .eq("user_id", userId)
    .gt("amount", 0)
    .or(`expires_at.gt.${now},expires_at.is.null`)
    .order("expires_at", { ascending: true, nullsFirst: false })

  // Also fetch negative rows to compute true batch balances
  const { data: debits } = await supabase
    .from("coin_ledger")
    .select("amount")
    .eq("user_id", userId)
    .lt("amount", 0)

  if (!credits) return false

  const totalDebited = (debits ?? []).reduce((s, r) => s + Math.abs(r.amount), 0)
  const totalCredit  = credits.reduce((s, r) => s + r.amount, 0)
  const spendable    = totalCredit - totalDebited

  if (spendable < cost) return false

  // Insert a single debit row — simple and correct
  const { error } = await supabase.from("coin_ledger").insert({
    user_id:      userId,
    amount:       -cost,
    type:         "consumed",
    expires_at:   null,
    reference_id: interviewId,
  })

  return !error
}
