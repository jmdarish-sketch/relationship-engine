-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  omi_api_key text, -- should be encrypted at application level
  created_at timestamptz not null default now()
);

-- People (contacts identified from conversations)
create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  first_name text,
  last_name text,
  display_label text,
  identity_fingerprint jsonb default '{}',
  identity_confidence float default 0,
  evolving_profile jsonb default '{}',
  topics_of_interest jsonb default '[]',
  relationship_strength text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  interaction_count int not null default 0,
  is_merged boolean not null default false,
  merged_into_id uuid references people(id) on delete set null
);

create index idx_people_user_id on people(user_id);

-- Interactions (conversation records from Omi)
create table interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  omi_conversation_id text unique,
  started_at timestamptz,
  finished_at timestamptz,
  raw_transcript text,
  omi_summary text,
  category text,
  geolocation jsonb,
  is_relevant boolean,
  relevance_score float
);

create index idx_interactions_user_id on interactions(user_id);
create index idx_interactions_omi_conversation_id on interactions(omi_conversation_id);

-- Junction: which people appeared in which interactions
create table interaction_people (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references interactions(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  speaker_id int,
  confidence float
);

create index idx_interaction_people_interaction_id on interaction_people(interaction_id);
create index idx_interaction_people_person_id on interaction_people(person_id);

-- Extracted details from conversations
create table extracted_details (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references interactions(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  detail_type text not null,
  content text not null,
  importance_score float,
  source_quote text,
  extracted_at timestamptz not null default now()
);

create index idx_extracted_details_interaction_id on extracted_details(interaction_id);
create index idx_extracted_details_person_id on extracted_details(person_id);

-- Identity signals used for person disambiguation
create table identity_signals (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  interaction_id uuid not null references interactions(id) on delete cascade,
  signal_type text not null,
  signal_value text not null,
  confidence float,
  observed_at timestamptz not null default now()
);

create index idx_identity_signals_person_id on identity_signals(person_id);
create index idx_identity_signals_interaction_id on identity_signals(interaction_id);

-- Insights generated from interactions
create table insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source_person_id uuid not null references people(id) on delete cascade,
  target_person_id uuid references people(id) on delete set null,
  interaction_id uuid not null references interactions(id) on delete cascade,
  insight_type text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_insights_user_id on insights(user_id);
create index idx_insights_interaction_id on insights(interaction_id);

-- Disambiguation queue for ambiguous person references
create table disambiguation_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  interaction_id uuid not null references interactions(id) on delete cascade,
  detected_name text not null,
  candidate_people_ids jsonb default '[]',
  extracted_context jsonb default '{}',
  resolution_status text not null default 'pending',
  resolved_person_id uuid references people(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_disambiguation_queue_user_id on disambiguation_queue(user_id);
create index idx_disambiguation_queue_interaction_id on disambiguation_queue(interaction_id);

-- Enable Row Level Security on all tables
alter table users enable row level security;
alter table people enable row level security;
alter table interactions enable row level security;
alter table interaction_people enable row level security;
alter table extracted_details enable row level security;
alter table identity_signals enable row level security;
alter table insights enable row level security;
alter table disambiguation_queue enable row level security;