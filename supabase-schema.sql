-- AI Radar production schema for Supabase/PostgreSQL
create extension if not exists pgcrypto;

create table if not exists categories (
  id text primary key,
  name text not null,
  name_ar text,
  icon text
);

create table if not exists tools (
  id text primary key,
  name text not null,
  slug text unique not null,
  description text,
  description_ar text,
  website text not null,
  logo text,
  company text,
  country text,
  category text,
  categories text[] default '{}',
  tags text[] default '{}',
  pricing text,
  free_plan boolean,
  price_from numeric,
  price_note text,
  arabic_support boolean,
  mobile_support boolean,
  api_available boolean,
  open_source boolean,
  platforms text[] default '{}',
  best_for text[] default '{}',
  pros text[] default '{}',
  cons text[] default '{}',
  privacy_info text,
  rating numeric,
  reviews_count integer,
  status text default 'active',
  verification_status text default 'unverified',
  last_checked timestamptz,
  last_verified timestamptz,
  date_added timestamptz default now(),
  features text[] default '{}'
);

create table if not exists features (
  id text primary key,
  name text not null,
  name_ar text
);

create table if not exists tool_features (
  tool_id text references tools(id) on delete cascade,
  feature_id text references features(id) on delete cascade,
  primary key(tool_id, feature_id)
);

create table if not exists pricing_plans (
  id uuid primary key default gen_random_uuid(),
  tool_id text references tools(id) on delete cascade,
  name text,
  price numeric,
  currency text default 'USD',
  billing_period text,
  limits text,
  source_url text,
  last_verified timestamptz
);

create table if not exists alternatives (
  tool_id text references tools(id) on delete cascade,
  alternative_tool_id text references tools(id) on delete cascade,
  score numeric,
  primary key(tool_id, alternative_tool_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  tool_id text references tools(id) on delete cascade,
  user_id uuid,
  rating integer check (rating between 1 and 5),
  body text,
  created_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  created_at timestamptz default now()
);

create table if not exists favorites (
  user_id uuid references users(id) on delete cascade,
  tool_id text references tools(id) on delete cascade,
  created_at timestamptz default now(),
  primary key(user_id, tool_id)
);

create table if not exists searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  query text not null,
  result_count integer,
  created_at timestamptz default now()
);

create table if not exists tool_updates (
  id uuid primary key default gen_random_uuid(),
  tool_id text references tools(id) on delete cascade,
  field_name text,
  old_value text,
  new_value text,
  source_url text,
  detected_at timestamptz default now(),
  status text default 'pending'
);

create table if not exists discovered_tools (
  id uuid primary key default gen_random_uuid(),
  name text,
  website text,
  source text,
  raw_data jsonb,
  status text default 'pending',
  discovered_at timestamptz default now(),
  review_notes text
);

create index if not exists tools_status_idx on tools(status);
create index if not exists tools_category_idx on tools(category);
create index if not exists tools_pricing_idx on tools(pricing);
create index if not exists searches_created_idx on searches(created_at desc);
