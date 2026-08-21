import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ResultsClient from "@/components/results/ResultsClient"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: interview } = await supabase
    .from("interviews")
    .select("id, category, difficulty, status, created_at, ended_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!interview) redirect("/")

  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("*")
    .eq("interview_id", id)
    .single()

  const { data: turns } = await supabase
    .from("conversation_turns")
    .select("speaker, text, sequence")
    .eq("interview_id", id)
    .order("sequence", { ascending: true })

  return (
    <ResultsClient
      interview={interview}
      evaluation={evaluation}
      transcript={turns ?? []}
    />
  )
}
