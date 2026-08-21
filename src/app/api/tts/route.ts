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

  const elevenKey  = process.env.ELEVENLABS_API_KEY
  const elevenVoice = process.env.ELEVENLABS_VOICE_ID

  // Use ElevenLabs if configured (Indian English voice), else fall back to Deepgram
  if (elevenKey && elevenVoice) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2 },
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      console.error("[tts] ElevenLabs error:", res.status, err)
      return NextResponse.json({ error: "TTS failed" }, { status: 502 })
    }
    const audio = await res.arrayBuffer()
    return new NextResponse(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    })
  }

  // Deepgram fallback
  const deepgramKey = process.env.DEEPGRAM_API_KEY
  if (!deepgramKey) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 500 })
  }

  const res = await fetch(
    "https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3",
    {
      method: "POST",
      headers: { Authorization: `Token ${deepgramKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error("[tts] Deepgram error:", err)
    return NextResponse.json({ error: "TTS failed" }, { status: 502 })
  }

  const audio = await res.arrayBuffer()
  return new NextResponse(audio, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  })
}
