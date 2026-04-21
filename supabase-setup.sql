-- ── stripe_customers ──────────────────────────────────────────────────────────
create table stripe_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  trial_end timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table stripe_customers enable row level security;

create policy "Users read own stripe record"
  on stripe_customers for select
  using (auth.uid() = user_id);

-- service role bypasses RLS by default — no insert/update policy needed for client

-- ── profiles ──────────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  household_size integer default 2,
  dietary_restrictions text[] default '{}',
  default_cook_time integer default 30,
  user_goals text[] default '{}',
  waitlist_position integer,
  referral_code text unique default substr(md5(random()::text), 1, 8),
  referral_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Users read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users insert own profile"
  on profiles for insert
  with check (auth.uid() = id);
