import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

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

  // Pick a question for this interview
  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("category", category)
    .eq("difficulty", difficulty)
    .limit(20)

  if (!questions || questions.length === 0) {
    // Fall back to any category questions
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

  // Create the interview
  const { data: interview, error } = await serviceClient
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

  if (error || !interview) {
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 })
  }

  return NextResponse.json({ id: interview.id })
}
