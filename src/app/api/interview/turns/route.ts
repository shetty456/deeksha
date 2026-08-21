import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { interview_id, interview_question_id, speaker, text, sequence, started_at, ended_at, metadata } = body

  if (!interview_id || !speaker || !text || sequence == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  // Verify the interview belongs to this user
  const { data: interview } = await supabase
    .from("interviews")
    .select("id")
    .eq("id", interview_id)
    .eq("user_id", user.id)
    .single()

  if (!interview) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const serviceClient = await createServiceClient()

  const { data: turn, error } = await serviceClient
    .from("conversation_turns")
    .insert({
      interview_id,
      interview_question_id: interview_question_id ?? null,
      speaker,
      text,
      sequence,
      started_at: started_at ?? null,
      ended_at: ended_at ?? null,
      metadata: metadata ?? null,
    })
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to save turn" }, { status: 500 })
  }

  return NextResponse.json({ id: turn.id })
}
