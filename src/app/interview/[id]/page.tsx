import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import InterviewClient from "@/components/interview/InterviewClient"

interface Props {
  params: Promise<{ id: string }>
}

export default async function InterviewPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch interview
  const { data: interview } = await supabase
    .from("interviews")
    .select("id, category, difficulty, duration_target, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!interview) redirect("/")
  if (interview.status === "completed") redirect(`/results/${id}`)

  // Pick a question for this interview
  const { data: questions } = await supabase
    .from("questions")
    .select("id, question, category, difficulty")
    .eq("category", interview.category)
    .eq("difficulty", interview.difficulty)
    .limit(20)

  // Random selection
  const pool = questions && questions.length > 0 ? questions : []
  const question = pool.length > 0
    ? pool[Math.floor(Math.random() * pool.length)]
    : { id: "fallback", question: `Tell me about a product you think could be improved and how you'd approach it.`, category: interview.category, difficulty: interview.difficulty }

  return (
    <InterviewClient
      interviewId={id}
      question={question}
      category={interview.category}
      difficulty={interview.difficulty}
      durationSeconds={interview.duration_target ?? 1200}
    />
  )
}
