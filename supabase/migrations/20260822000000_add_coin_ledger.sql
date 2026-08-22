-- Migration: add_coin_ledger
-- Coin-based billing system: buy packs, use them, expire after 28 days

-- ============================================================
-- COIN LEDGER
-- ============================================================
-- Each row is a credit (+) or debit (-) event.
-- expires_at is set per-batch so buying a new pack doesn't reset
-- expiry on older coins. NULL expires_at = never expires (unused).
create table if not exists coin_ledger (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) not null,
  amount       int not null,                          -- positive = credit, negative = debit
  type         text not null check (type in (
                  'signup_bonus',   -- free 30 coins on new account
                  'purchase',       -- paid coin pack
                  'consumed'        -- interview session deduction
               )),
  expires_at   timestamptz,                           -- NULL only for legacy rows; always set for real events
  reference_id text,                                  -- Razorpay order id (purchase) or interview id (consumed)
  created_at   timestamptz default now()
);

-- Index for fast spendable-balance queries (filter by user + expiry)
create index if not exists coin_ledger_user_expires
  on coin_ledger (user_id, expires_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table coin_ledger enable row level security;

-- Users can only read their own ledger rows (no writes via client)
create policy "coin_ledger_own_read" on coin_ledger
  for select using (auth.uid() = user_id);

-- ============================================================
-- CREDIT 30 SIGNUP-BONUS COINS FOR NEW USERS
-- ============================================================
-- Extend the existing handle_new_user() trigger to also insert
-- a signup_bonus row into coin_ledger (expires 28 days from now).
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- Create profile
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- Credit 30 free coins (valid 28 days)
  insert into public.coin_ledger (user_id, amount, type, expires_at)
  values (new.id, 30, 'signup_bonus', now() + interval '28 days');

  return new;
end;
$$;
