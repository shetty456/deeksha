import { NextResponse } from "next/server"
import crypto from "crypto"
import { createServiceClient } from "@/lib/supabase/server"
import { COIN_PACKS, type PackId } from "@/lib/coins"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("x-razorpay-signature") ?? ""
  const secret = process.env.RAZORPAY_KEY_SECRET!

  // Verify Razorpay webhook signature
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")

  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.event !== "payment.captured") {
    return NextResponse.json({ ok: true })
  }

  const payment = event.payload?.payment?.entity
  if (!payment) {
    return NextResponse.json({ error: "No payment entity" }, { status: 400 })
  }

  const notes   = payment.notes ?? {}
  const userId  = notes.user_id as string
  const packId  = notes.pack_id as PackId
  const pack    = COIN_PACKS.find((p) => p.id === packId)

  if (!userId || !pack) {
    return NextResponse.json({ error: "Missing notes" }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const expiresAt = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from("coin_ledger").insert({
    user_id:      userId,
    amount:       pack.coins,
    type:         "purchase",
    expires_at:   expiresAt,
    reference_id: payment.order_id,
  })

  if (error) {
    console.error("coin_ledger insert failed", error)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
