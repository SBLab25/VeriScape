
-- ============================================
-- 1. SEASONAL EVENTS SYSTEM
-- ============================================
CREATE TABLE public.seasonal_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  theme TEXT NOT NULL,
  season TEXT NOT NULL DEFAULT 'custom',
  banner_url TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reward_type TEXT,
  reward_value INTEGER,
  xp_multiplier REAL NOT NULL DEFAULT 1.0,
  special_badge_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.seasonal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view seasonal events" ON public.seasonal_events FOR SELECT USING (true);
CREATE POLICY "Admins can manage seasonal events" ON public.seasonal_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.seasonal_event_quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.seasonal_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  xp_reward INTEGER NOT NULL DEFAULT 100,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme_tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.seasonal_event_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view seasonal quests" ON public.seasonal_event_quests FOR SELECT USING (true);

CREATE TABLE public.seasonal_event_participation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.seasonal_events(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES public.seasonal_event_quests(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'joined',
  points_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id, quest_id)
);
ALTER TABLE public.seasonal_event_participation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own participation" ON public.seasonal_event_participation FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can join events" ON public.seasonal_event_participation FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participation" ON public.seasonal_event_participation FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 2. QUEST CHAINS
-- ============================================
CREATE TABLE public.quest_chains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  storyline TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  total_steps INTEGER NOT NULL DEFAULT 1,
  total_xp_reward INTEGER NOT NULL DEFAULT 500,
  bonus_reward_type TEXT,
  bonus_reward_value INTEGER,
  category TEXT NOT NULL DEFAULT 'adventure',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.quest_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view quest chains" ON public.quest_chains FOR SELECT USING (true);
CREATE POLICY "Admins can manage quest chains" ON public.quest_chains FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.quest_chain_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID NOT NULL REFERENCES public.quest_chains(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  narrative TEXT,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  unlock_condition TEXT DEFAULT 'previous_step',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chain_id, step_number)
);
ALTER TABLE public.quest_chain_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chain steps" ON public.quest_chain_steps FOR SELECT USING (true);

CREATE TABLE public.user_quest_chain_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chain_id UUID NOT NULL REFERENCES public.quest_chains(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress',
  steps_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, chain_id)
);
ALTER TABLE public.user_quest_chain_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chain progress" ON public.user_quest_chain_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can start chains" ON public.user_quest_chain_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_quest_chain_progress FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 3. SOCIAL GROUPS / CLUBS
-- ============================================
CREATE TABLE public.social_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  icon_emoji TEXT DEFAULT '🏕️',
  banner_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  max_members INTEGER DEFAULT 50,
  owner_id UUID NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.social_groups ENABLE ROW LEVEL SECURITY;
-- Simple SELECT policy first (no cross-reference)
CREATE POLICY "Anyone can view public groups" ON public.social_groups FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create groups" ON public.social_groups FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update groups" ON public.social_groups FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete groups" ON public.social_groups FOR DELETE USING (auth.uid() = owner_id);

CREATE TABLE public.social_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.social_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view group members" ON public.social_group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.social_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.social_group_members FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.social_group_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.social_group_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members can view posts" ON public.social_group_posts FOR SELECT USING (EXISTS(SELECT 1 FROM public.social_group_members WHERE group_id = social_group_posts.group_id AND user_id = auth.uid()));
CREATE POLICY "Group members can create posts" ON public.social_group_posts FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS(SELECT 1 FROM public.social_group_members WHERE group_id = social_group_posts.group_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own group posts" ON public.social_group_posts FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. AR QUEST ELEMENTS
-- ============================================
CREATE TABLE public.ar_quest_markers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  marker_type TEXT NOT NULL DEFAULT 'collectible',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 50,
  ar_model_url TEXT,
  ar_overlay_emoji TEXT DEFAULT '⭐',
  xp_reward INTEGER NOT NULL DEFAULT 25,
  is_active BOOLEAN NOT NULL DEFAULT true,
  collected_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ar_quest_markers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view AR markers" ON public.ar_quest_markers FOR SELECT USING (true);
CREATE POLICY "Admins can manage AR markers" ON public.ar_quest_markers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_ar_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  marker_id UUID NOT NULL REFERENCES public.ar_quest_markers(id) ON DELETE CASCADE,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  photo_proof_url TEXT,
  UNIQUE(user_id, marker_id)
);
ALTER TABLE public.user_ar_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own collections" ON public.user_ar_collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can collect markers" ON public.user_ar_collections FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_seasonal_events_active ON public.seasonal_events(is_active, start_date, end_date);
CREATE INDEX idx_seasonal_event_quests_event ON public.seasonal_event_quests(event_id);
CREATE INDEX idx_seasonal_participation_user ON public.seasonal_event_participation(user_id, event_id);
CREATE INDEX idx_quest_chains_active ON public.quest_chains(is_active);
CREATE INDEX idx_quest_chain_steps_chain ON public.quest_chain_steps(chain_id, step_number);
CREATE INDEX idx_user_chain_progress ON public.user_quest_chain_progress(user_id, chain_id);
CREATE INDEX idx_social_groups_category ON public.social_groups(category, is_public);
CREATE INDEX idx_social_group_members_group ON public.social_group_members(group_id, user_id);
CREATE INDEX idx_social_group_posts_group ON public.social_group_posts(group_id, created_at DESC);
CREATE INDEX idx_ar_markers_location ON public.ar_quest_markers(latitude, longitude);
CREATE INDEX idx_ar_collections_user ON public.user_ar_collections(user_id);
