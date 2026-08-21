import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import HomeClient from "@/components/home/HomeClient"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: recentInterviews } = await supabase
    .from("interviews")
    .select("id, category, difficulty, status, overall_score, created_at, ended_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  return <HomeClient user={user} recentInterviews={recentInterviews ?? []} />
}
