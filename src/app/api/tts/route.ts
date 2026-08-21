import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { text } = await req.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: "Empty text" }, { status: 400 })
  }

  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 500 })
  }

  const res = await fetch(
    "https://api.deepgram.com/v1/speak?model=aura-2-en&encoding=mp3",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error("Deepgram TTS error:", err)
    return NextResponse.json({ error: "TTS failed" }, { status: 502 })
  }

  const audioBuffer = await res.arrayBuffer()

  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  })
}
