import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { interview_id } = await req.json()

  if (!interview_id) {
    return NextResponse.json({ error: "Missing interview_id" }, { status: 400 })
  }

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

  await serviceClient
    .from("interviews")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", interview_id)

  return NextResponse.json({ ok: true })
}
