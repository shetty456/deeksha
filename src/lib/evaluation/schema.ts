import { z } from "zod"

export const EvaluationSchema = z.object({
  overall_score: z.number().min(0).max(10),
  dimensions: z.object({
    structure: z.number().min(0).max(10),
    product_thinking: z.number().min(0).max(10),
    communication: z.number().min(0).max(10),
    metrics: z.number().min(0).max(10),
    prioritization: z.number().min(0).max(10),
    analytical_thinking: z.number().min(0).max(10),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missed_opportunities: z.array(z.string()),
  recommendations: z.array(z.string()),
  summary: z.string(),
})

export type Evaluation = z.infer<typeof EvaluationSchema>
