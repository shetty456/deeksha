import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const difficulty = searchParams.get("difficulty")
  const limit = parseInt(searchParams.get("limit") ?? "5", 10)

  let query = supabase.from("questions").select("id, question, category, difficulty")

  if (category) query = query.eq("category", category)
  if (difficulty) query = query.eq("difficulty", difficulty)

  query = query.limit(Math.min(limit, 20))

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }

  return NextResponse.json({ questions: data ?? [] })
}
