import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { COIN_COST, deductCoins } from "@/lib/coins"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { category, difficulty, duration_target } = body

  if (!category || !difficulty || !duration_target) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const cost = COIN_COST[duration_target as number]
  if (cost === undefined) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 })
  }

  // Pick a question for this interview
  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("category", category)
    .eq("difficulty", difficulty)
    .limit(20)

  if (!questions || questions.length === 0) {
    const { data: fallback } = await supabase
      .from("questions")
      .select("id")
      .eq("category", category)
      .limit(20)

    if (!fallback || fallback.length === 0) {
      return NextResponse.json({ error: "No questions available" }, { status: 422 })
    }
  }

  const serviceClient = await createServiceClient()

  // Create the interview record first so we have an id for the ledger reference
  const { data: interview, error: interviewError } = await serviceClient
    .from("interviews")
    .insert({
      user_id: user.id,
      category,
      difficulty,
      duration_target,
      status: "pending",
    })
    .select("id")
    .single()

  if (interviewError || !interview) {
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 })
  }

  // Deduct coins — if insufficient, delete the interview and return 402
  const ok = await deductCoins(serviceClient, user.id, cost, interview.id)
  if (!ok) {
    await serviceClient.from("interviews").delete().eq("id", interview.id)
    return NextResponse.json(
      { error: "insufficient_coins", cost, message: `This session costs ${cost} coins. Please top up to continue.` },
      { status: 402 }
    )
  }

  return NextResponse.json({ id: interview.id })
}
