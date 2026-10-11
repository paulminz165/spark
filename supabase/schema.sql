-- ============================================
-- SPARK — IIT Delhi Dating App
-- Supabase Database Schema
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES
-- ============================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  phone text,
  phone_verified boolean default false,
  program text not null, -- 'B.Tech', 'M.Tech', 'MBA', 'PhD', 'M.Sc'
  department text,
  year_of_joining integer,
  gender text not null, -- 'male', 'female', 'non-binary', 'prefer_not_to_say'
  bio text,
  photo_url text,
  date_of_birth date,

  -- Dealbreakers (hard filters)
  diet text, -- 'veg', 'non-veg', 'vegan', 'no_preference'
  smoker boolean default false,
  drinker text default 'no_preference', -- 'never', 'sometimes', 'often', 'no_preference'
  chronotype text, -- 'early_bird', 'night_owl', 'flexible'
  relationship_goal text, -- 'serious', 'casual', 'figuring_out'

  -- Dealbreaker preferences (what they want in a match)
  pref_diet text[], -- acceptable diets
  pref_smoker boolean, -- null = no preference
  pref_gender text[], -- genders they want to match with
  pref_age_min integer default 18,
  pref_age_max integer default 30,

  -- Status
  is_active boolean default true,
  onboarding_completed boolean default false,
  quiz_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: users can read active profiles, edit only their own
alter table profiles enable row level security;

create policy "Users can view active profiles"
  on profiles for select
  using (is_active = true);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- 2. INTERESTS
-- ============================================
create table interests (
  id serial primary key,
  name text unique not null,
  category text not null, -- 'sports', 'music', 'food', 'academic', 'entertainment', 'lifestyle', 'creative'
  icon text -- emoji
);

-- Seed interests
insert into interests (name, category, icon) values
  -- Sports
  ('Cricket', 'sports', '🏏'),
  ('Football', 'sports', '⚽'),
  ('Badminton', 'sports', '🏸'),
  ('Table Tennis', 'sports', '🏓'),
  ('Running', 'sports', '🏃'),
  ('Gym', 'sports', '💪'),
  ('Yoga', 'sports', '🧘'),
  ('Swimming', 'sports', '🏊'),
  -- Music
  ('Bollywood Music', 'music', '🎵'),
  ('Indie/Alt', 'music', '🎸'),
  ('Hip Hop', 'music', '🎤'),
  ('Classical', 'music', '🎻'),
  ('Playing Guitar', 'music', '🎸'),
  ('Singing', 'music', '🎶'),
  -- Food
  ('Street Food', 'food', '🍜'),
  ('Cooking', 'food', '👨‍🍳'),
  ('Chai Lover', 'food', '☕'),
  ('Coffee Snob', 'food', '☕'),
  ('Baking', 'food', '🍰'),
  ('Trying New Restaurants', 'food', '🍽️'),
  -- Academic
  ('Competitive Programming', 'academic', '💻'),
  ('Research', 'academic', '🔬'),
  ('Startups', 'academic', '🚀'),
  ('Case Competitions', 'academic', '📊'),
  ('Reading', 'academic', '📚'),
  ('Finance & Markets', 'academic', '📈'),
  -- Entertainment
  ('Anime', 'entertainment', '🎌'),
  ('Bollywood', 'entertainment', '🎬'),
  ('Hollywood', 'entertainment', '🎥'),
  ('K-Drama', 'entertainment', '📺'),
  ('Stand-up Comedy', 'entertainment', '😂'),
  ('Gaming', 'entertainment', '🎮'),
  ('Memes', 'entertainment', '🤣'),
  -- Lifestyle
  ('Night Owl', 'lifestyle', '🦉'),
  ('Early Bird', 'lifestyle', '🌅'),
  ('Travel', 'lifestyle', '✈️'),
  ('Photography', 'lifestyle', '📸'),
  ('Trekking', 'lifestyle', '🥾'),
  ('Pets', 'lifestyle', '🐕'),
  -- Creative
  ('Dancing', 'creative', '💃'),
  ('Theatre', 'creative', '🎭'),
  ('Writing', 'creative', '✍️'),
  ('Art & Design', 'creative', '🎨'),
  ('Content Creation', 'creative', '📱');

-- User interests (many-to-many)
create table user_interests (
  user_id uuid references profiles(id) on delete cascade,
  interest_id integer references interests(id) on delete cascade,
  primary key (user_id, interest_id)
);

alter table user_interests enable row level security;

create policy "Users can view interests" on user_interests for select using (true);
create policy "Users can manage own interests" on user_interests for all using (auth.uid() = user_id);

-- ============================================
-- 3. COMPATIBILITY QUIZ
-- ============================================
create table quiz_questions (
  id serial primary key,
  question_text text not null,
  dimension text not null, -- 'lifestyle', 'values', 'social_energy', 'communication', 'interests'
  options jsonb not null, -- [{id: 'a', text: '...', scores: {lifestyle: 3, ...}}, ...]
  display_order integer not null
);

-- Seed quiz questions
insert into quiz_questions (question_text, dimension, options, display_order) values
(
  'It''s Friday 11 PM. Where are you most likely?',
  'lifestyle',
  '[
    {"id": "a", "text": "At Masala Mix with friends", "scores": {"social_energy": 4, "lifestyle": 3}},
    {"id": "b", "text": "Library — deadline tomorrow", "scores": {"social_energy": 1, "lifestyle": 5}},
    {"id": "c", "text": "In my room watching something", "scores": {"social_energy": 2, "lifestyle": 2}},
    {"id": "d", "text": "Out in Hauz Khas", "scores": {"social_energy": 5, "lifestyle": 4}}
  ]',
  1
),
(
  'Your project partner ghosts you before a deadline. What do you do?',
  'values',
  '[
    {"id": "a", "text": "Do the whole thing yourself, silently", "scores": {"values": 4, "communication": 1}},
    {"id": "b", "text": "Message them directly and ask what happened", "scores": {"values": 3, "communication": 5}},
    {"id": "c", "text": "Complain to the group, let peer pressure work", "scores": {"values": 2, "communication": 2}},
    {"id": "d", "text": "Talk to the prof — it''s not your problem alone", "scores": {"values": 5, "communication": 3}}
  ]',
  2
),
(
  'You have a free Sunday. What sounds best?',
  'lifestyle',
  '[
    {"id": "a", "text": "Exploring a new café with 1-2 close friends", "scores": {"social_energy": 3, "lifestyle": 3}},
    {"id": "b", "text": "Full day alone — sleep, read, recharge", "scores": {"social_energy": 1, "lifestyle": 2}},
    {"id": "c", "text": "Big group plan — Connaught Place or a trek", "scores": {"social_energy": 5, "lifestyle": 4}},
    {"id": "d", "text": "Working on a side project or startup idea", "scores": {"social_energy": 2, "lifestyle": 5}}
  ]',
  3
),
(
  'In a relationship, what matters most to you?',
  'values',
  '[
    {"id": "a", "text": "Intellectual conversations", "scores": {"values": 5, "communication": 4}},
    {"id": "b", "text": "Emotional support and understanding", "scores": {"values": 4, "communication": 5}},
    {"id": "c", "text": "Having fun and shared adventures", "scores": {"values": 3, "communication": 3}},
    {"id": "d", "text": "Independence and personal space", "scores": {"values": 2, "communication": 2}}
  ]',
  4
),
(
  'How quickly do you reply to messages?',
  'communication',
  '[
    {"id": "a", "text": "Instantly — I''m always on my phone", "scores": {"communication": 5, "social_energy": 4}},
    {"id": "b", "text": "Within an hour usually", "scores": {"communication": 4, "social_energy": 3}},
    {"id": "c", "text": "When I get to it — could be hours", "scores": {"communication": 2, "social_energy": 2}},
    {"id": "d", "text": "I''m terrible at texting, prefer calls/in-person", "scores": {"communication": 3, "social_energy": 3}}
  ]',
  5
),
(
  'Your friend is upset about a bad grade. What do you do?',
  'values',
  '[
    {"id": "a", "text": "Listen and validate — they need to vent", "scores": {"values": 4, "communication": 5}},
    {"id": "b", "text": "Offer solutions — help them study better next time", "scores": {"values": 5, "communication": 3}},
    {"id": "c", "text": "Distract them — take them out for chai", "scores": {"values": 3, "communication": 3}},
    {"id": "d", "text": "Be honest — tell them what went wrong", "scores": {"values": 5, "communication": 2}}
  ]',
  6
),
(
  'Ideal first date?',
  'lifestyle',
  '[
    {"id": "a", "text": "Chai at Amul and a long walk", "scores": {"lifestyle": 2, "social_energy": 2}},
    {"id": "b", "text": "Trying street food somewhere in Old Delhi", "scores": {"lifestyle": 4, "social_energy": 3}},
    {"id": "c", "text": "A quiet café with good coffee", "scores": {"lifestyle": 3, "social_energy": 2}},
    {"id": "d", "text": "Something active — bowling, escape room", "scores": {"lifestyle": 5, "social_energy": 4}}
  ]',
  7
),
(
  'How do you handle disagreements?',
  'communication',
  '[
    {"id": "a", "text": "Talk it out immediately — I hate unresolved tension", "scores": {"communication": 5, "values": 4}},
    {"id": "b", "text": "Take space first, then discuss calmly", "scores": {"communication": 4, "values": 5}},
    {"id": "c", "text": "Avoid conflict — I''d rather let it go", "scores": {"communication": 1, "values": 2}},
    {"id": "d", "text": "Use humour to defuse things", "scores": {"communication": 3, "values": 3}}
  ]',
  8
),
(
  'What kind of content do you consume most?',
  'lifestyle',
  '[
    {"id": "a", "text": "Podcasts and long reads", "scores": {"lifestyle": 4, "values": 5}},
    {"id": "b", "text": "Memes, reels, short-form", "scores": {"lifestyle": 2, "social_energy": 3}},
    {"id": "c", "text": "TV series — I commit to the whole season", "scores": {"lifestyle": 3, "social_energy": 2}},
    {"id": "d", "text": "News and current affairs", "scores": {"lifestyle": 5, "values": 4}}
  ]',
  9
),
(
  'A group trip is being planned. What role do you play?',
  'social_energy',
  '[
    {"id": "a", "text": "The planner — itinerary, bookings, budget", "scores": {"social_energy": 4, "values": 5}},
    {"id": "b", "text": "The hype person — keeping energy up", "scores": {"social_energy": 5, "values": 3}},
    {"id": "c", "text": "The quiet one who''s just happy to be there", "scores": {"social_energy": 2, "values": 3}},
    {"id": "d", "text": "I skip group trips — too many people", "scores": {"social_energy": 1, "values": 2}}
  ]',
  10
),
(
  'What''s your take on ambition?',
  'values',
  '[
    {"id": "a", "text": "It''s everything — I want to build something big", "scores": {"values": 5, "lifestyle": 5}},
    {"id": "b", "text": "Important but balance matters more", "scores": {"values": 4, "lifestyle": 3}},
    {"id": "c", "text": "I go with the flow — not too intense about it", "scores": {"values": 2, "lifestyle": 2}},
    {"id": "d", "text": "I''m ambitious but quietly — no need to broadcast", "scores": {"values": 4, "lifestyle": 4}}
  ]',
  11
),
(
  'How important is physical fitness to you?',
  'lifestyle',
  '[
    {"id": "a", "text": "Very — I work out regularly", "scores": {"lifestyle": 5, "values": 4}},
    {"id": "b", "text": "I try but I''m not consistent", "scores": {"lifestyle": 3, "values": 3}},
    {"id": "c", "text": "Not really my thing", "scores": {"lifestyle": 1, "values": 2}},
    {"id": "d", "text": "I stay active through sports, not gym", "scores": {"lifestyle": 4, "values": 3}}
  ]',
  12
),
(
  'Pick the vibe that feels most like you:',
  'social_energy',
  '[
    {"id": "a", "text": "Deep conversations at 2 AM", "scores": {"social_energy": 3, "communication": 5}},
    {"id": "b", "text": "Dancing at a college fest", "scores": {"social_energy": 5, "communication": 3}},
    {"id": "c", "text": "Quiet library mornings with chai", "scores": {"social_energy": 1, "communication": 2}},
    {"id": "d", "text": "Road trip with close friends", "scores": {"social_energy": 4, "communication": 4}}
  ]',
  13
),
(
  'How do you feel about PDA (public display of affection)?',
  'communication',
  '[
    {"id": "a", "text": "Totally fine — why hide it?", "scores": {"communication": 4, "social_energy": 5}},
    {"id": "b", "text": "Subtle — hand holding is fine", "scores": {"communication": 3, "social_energy": 3}},
    {"id": "c", "text": "Not on campus — too many people know me", "scores": {"communication": 2, "social_energy": 2}},
    {"id": "d", "text": "Keep it private — that''s between us", "scores": {"communication": 2, "social_energy": 1}}
  ]',
  14
),
(
  'What would make you unmatch someone instantly?',
  'values',
  '[
    {"id": "a", "text": "Being rude to service staff", "scores": {"values": 5, "communication": 4}},
    {"id": "b", "text": "Zero curiosity — never asks questions", "scores": {"values": 4, "communication": 5}},
    {"id": "c", "text": "Love-bombing — too intense too fast", "scores": {"values": 3, "communication": 3}},
    {"id": "d", "text": "Being fake or performative", "scores": {"values": 5, "communication": 2}}
  ]',
  15
);

-- User quiz responses
create table quiz_responses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  question_id integer references quiz_questions(id),
  selected_option text not null, -- 'a', 'b', 'c', 'd'
  created_at timestamptz default now(),
  unique(user_id, question_id)
);

alter table quiz_responses enable row level security;
create policy "Users can manage own responses" on quiz_responses for all using (auth.uid() = user_id);

-- Computed compatibility scores per user (updated after quiz)
create table user_scores (
  user_id uuid primary key references profiles(id) on delete cascade,
  lifestyle_score float default 0,
  values_score float default 0,
  social_energy_score float default 0,
  communication_score float default 0,
  updated_at timestamptz default now()
);

alter table user_scores enable row level security;
create policy "Users can view scores" on user_scores for select using (true);
create policy "Users can update own scores" on user_scores for all using (auth.uid() = user_id);

-- ============================================
-- 4. MATCHES
-- ============================================
create table matches (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid references profiles(id) on delete cascade,
  user_b uuid references profiles(id) on delete cascade,
  compatibility_score float not null, -- 0 to 100
  score_breakdown jsonb, -- {"lifestyle": 85, "values": 90, ...}
  shared_interests text[], -- ["Street Food", "Night Owl", ...]
  spark_prompt text, -- auto-generated conversation starter
  photo_unlocked_at timestamptz, -- null until 24h after match
  status text default 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  feedback_a text, -- 'good', 'bad'
  feedback_b text,
  week_of date not null, -- which weekly batch this belongs to
  created_at timestamptz default now(),
  unique(user_a, user_b, week_of)
);

alter table matches enable row level security;

create policy "Users can view own matches"
  on matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Users can update own matches"
  on matches for update
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ============================================
-- 5. CHAT
-- ============================================
create table messages (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "Users can view messages in their matches"
  on messages for select
  using (
    exists (
      select 1 from matches
      where matches.id = messages.match_id
      and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  );

create policy "Users can send messages in their matches"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from matches
      where matches.id = messages.match_id
      and matches.status = 'accepted'
      and (matches.user_a = auth.uid() or matches.user_b = auth.uid())
    )
  );

-- ============================================
-- 6. CONFESSIONS (V1.1 — schema ready)
-- ============================================
create table confessions (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references profiles(id) on delete set null, -- null = fully anonymous
  content text not null,
  target_hint text, -- "someone from M.Tech CSE who sits in the back row"
  likes_count integer default 0,
  is_approved boolean default false, -- moderation flag
  created_at timestamptz default now()
);

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- Auto-unlock photos 24h after match creation
create or replace function check_photo_unlock()
returns void as $$
begin
  update matches
  set photo_unlocked_at = now()
  where photo_unlocked_at is null
    and status = 'accepted'
    and created_at < now() - interval '24 hours';
end;
$$ language plpgsql;
