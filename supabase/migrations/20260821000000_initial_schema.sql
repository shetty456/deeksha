-- Migration: initial_schema
-- Creates all core tables for the Deeksha PM interview platform

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id         uuid references auth.users primary key,
  full_name  text,
  email      text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- QUESTIONS
-- ============================================================
create table if not exists questions (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,
  category      text not null,
  subcategory   text,
  difficulty    text check (difficulty in ('easy', 'medium', 'hard')),
  question_type text,
  company       text,
  tags          text[],
  metadata      jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- INTERVIEWS
-- ============================================================
create table if not exists interviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) not null,
  category        text not null,
  difficulty      text,
  duration_target int,       -- seconds
  started_at      timestamptz,
  ended_at        timestamptz,
  status          text default 'pending'
                  check (status in ('pending', 'active', 'completed', 'abandoned')),
  overall_score   numeric(4, 2),
  created_at      timestamptz default now()
);

-- ============================================================
-- INTERVIEW QUESTIONS
-- ============================================================
create table if not exists interview_questions (
  id           uuid primary key default gen_random_uuid(),
  interview_id uuid references interviews(id) on delete cascade not null,
  question_id  uuid references questions(id) not null,
  sequence     int not null,
  started_at   timestamptz,
  ended_at     timestamptz,
  status       text default 'pending'
);

-- ============================================================
-- CONVERSATION TURNS
-- ============================================================
create table if not exists conversation_turns (
  id                    uuid primary key default gen_random_uuid(),
  interview_id          uuid references interviews(id) on delete cascade not null,
  interview_question_id uuid references interview_questions(id),
  speaker               text not null check (speaker in ('candidate', 'interviewer')),
  text                  text not null,
  sequence              int not null,
  started_at            timestamptz,
  ended_at              timestamptz,
  metadata              jsonb
);

-- ============================================================
-- EVALUATIONS
-- ============================================================
create table if not exists evaluations (
  id                       uuid primary key default gen_random_uuid(),
  interview_id             uuid references interviews(id) on delete cascade unique not null,
  overall_score            numeric(4, 2),
  communication_score      numeric(4, 2),
  structure_score          numeric(4, 2),
  product_thinking_score   numeric(4, 2),
  analytical_thinking_score numeric(4, 2),
  prioritization_score     numeric(4, 2),
  metrics_score            numeric(4, 2),
  strengths                text[],
  weaknesses               text[],
  missed_opportunities     text[],
  recommendations          text[],
  summary                  text,
  raw_response             jsonb,
  created_at               timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles          enable row level security;
alter table questions         enable row level security;
alter table interviews        enable row level security;
alter table interview_questions enable row level security;
alter table conversation_turns  enable row level security;
alter table evaluations         enable row level security;

-- Profiles: each user can only access their own row
create policy "profiles_own" on profiles
  for all using (auth.uid() = id);

-- Questions: any authenticated user can read; only service role can write
create policy "questions_read" on questions
  for select using (auth.role() = 'authenticated');

-- Interviews: own rows only
create policy "interviews_own" on interviews
  for all using (auth.uid() = user_id);

-- Interview questions: accessible if the parent interview belongs to the user
create policy "interview_questions_own" on interview_questions
  for all using (
    interview_id in (
      select id from interviews where user_id = auth.uid()
    )
  );

-- Conversation turns: accessible if the parent interview belongs to the user
create policy "conversation_turns_own" on conversation_turns
  for all using (
    interview_id in (
      select id from interviews where user_id = auth.uid()
    )
  );

-- Evaluations: accessible if the parent interview belongs to the user
create policy "evaluations_own" on evaluations
  for all using (
    interview_id in (
      select id from interviews where user_id = auth.uid()
    )
  );
