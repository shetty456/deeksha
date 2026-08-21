import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Deepgram not configured" }, { status: 500 })
  }

  // Issue a temporary key scoped to usage only
  const res = await fetch("https://api.deepgram.com/v1/projects", {
    headers: { Authorization: `Token ${apiKey}` },
  })

  if (!res.ok) {
    // Fall back to returning the project key directly (acceptable for MVP)
    // In production, use Deepgram's temporary key API with an expiry
    return NextResponse.json({ key: apiKey })
  }

  const { projects } = await res.json()
  const projectId = projects?.[0]?.project_id

  if (!projectId) {
    return NextResponse.json({ key: apiKey })
  }

  // Create a temporary key (30-minute TTL)
  const tmpRes = await fetch(
    `https://api.deepgram.com/v1/projects/${projectId}/keys`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: "deeksha-tmp",
        scopes: ["usage:write"],
        time_to_live_in_seconds: 1800,
      }),
    }
  )

  if (!tmpRes.ok) {
    return NextResponse.json({ key: apiKey })
  }

  const { key } = await tmpRes.json()
  return NextResponse.json({ key: key.key })
}
