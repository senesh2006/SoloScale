-- Dev 2 — Supabase schema (run in Supabase SQL editor)

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  goal_prompt text not null,
  status text not null default 'draft',
  strategy_json jsonb,
  created_at timestamptz not null default now(),
  event_id uuid
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  slug text not null unique,
  published boolean not null default false,
  landing jsonb not null,
  form_fields jsonb not null default '[]',
  attendee_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  kind text not null,
  status text not null default 'pending',
  url text,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create table if not exists attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table campaigns
  add constraint campaigns_event_id_fkey
  foreign key (event_id) references events (id);
