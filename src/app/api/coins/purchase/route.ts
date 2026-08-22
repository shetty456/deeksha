import { NextResponse } from "next/server"
import Razorpay from "razorpay"
import { createClient } from "@/lib/supabase/server"
import { COIN_PACKS, type PackId } from "@/lib/coins"

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { packId } = await req.json() as { packId: PackId }
  const pack = COIN_PACKS.find((p) => p.id === packId)
  if (!pack) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 })
  }

  // Razorpay amount is in paise (1 INR = 100 paise)
  const order = await razorpay.orders.create({
    amount:   pack.price * 100,
    currency: "INR",
    notes: {
      user_id: user.id,
      pack_id: pack.id,
      coins:   String(pack.coins),
    },
  })

  return NextResponse.json({
    orderId:  order.id,
    amount:   order.amount,
    currency: order.currency,
    keyId:    process.env.RAZORPAY_KEY_ID,
  })
}
