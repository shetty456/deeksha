export type InterviewCategory =
  | "product_sense"
  | "product_strategy"
  | "execution"
  | "metrics"
  | "estimation"
  | "behavioral"
  | "growth"

export type Difficulty = "easy" | "medium" | "hard"

export type Duration = 300 | 600 | 1200 | 1800 // seconds

export interface CategoryMeta {
  id: InterviewCategory
  label: string
  description: string
}

export interface DurationOption {
  seconds: Duration
  label: string
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "product_sense",
    label: "Product Sense",
    description: "Improve, design, and prioritize products",
  },
  {
    id: "product_strategy",
    label: "Product Strategy",
    description: "Market positioning, competitive analysis",
  },
  {
    id: "execution",
    label: "Execution",
    description: "Launching features, managing trade-offs",
  },
  {
    id: "metrics",
    label: "Metrics & Analytics",
    description: "Defining success, diagnosing problems",
  },
  {
    id: "estimation",
    label: "Estimation",
    description: "Market sizing and back-of-envelope math",
  },
  {
    id: "behavioral",
    label: "Behavioral",
    description: "Leadership, influence, and past experience",
  },
  {
    id: "growth",
    label: "Growth",
    description: "Acquisition, retention, and monetization",
  },
]

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Entry level" },
  { value: "medium", label: "Mid-level" },
  { value: "hard", label: "Senior / Staff" },
]

export const DURATIONS: DurationOption[] = [
  { seconds: 300,  label: "5 min" },
  { seconds: 600,  label: "10 min" },
  { seconds: 1200, label: "20 min" },
  { seconds: 1800, label: "30 min" },
]
