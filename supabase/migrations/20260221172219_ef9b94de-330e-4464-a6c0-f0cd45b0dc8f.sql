
-- Push subscription storage for Web Push API
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- User quest stats for adaptive difficulty
CREATE TABLE public.user_quest_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_completed INTEGER NOT NULL DEFAULT 0,
  easy_completed INTEGER NOT NULL DEFAULT 0,
  medium_completed INTEGER NOT NULL DEFAULT 0,
  hard_completed INTEGER NOT NULL DEFAULT 0,
  legendary_completed INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  success_rate REAL NOT NULL DEFAULT 0,
  avg_completion_time_hours REAL,
  preferred_category TEXT,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_quest_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats"
  ON public.user_quest_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON public.user_quest_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.user_quest_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to calculate user level from XP
CREATE OR REPLACE FUNCTION public.calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Level formula: each level requires progressively more XP
  -- Level 1: 0, Level 2: 100, Level 3: 250, Level 4: 450, etc.
  RETURN GREATEST(1, FLOOR(0.5 + SQRT(1 + 8.0 * xp / 100) / 2)::INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get recommended difficulty based on user level
CREATE OR REPLACE FUNCTION public.get_recommended_difficulty(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_level INTEGER;
  v_success REAL;
BEGIN
  SELECT current_level, success_rate INTO v_level, v_success
  FROM public.user_quest_stats WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN RETURN 'easy'; END IF;
  
  -- Adaptive: factor in both level and success rate
  IF v_level >= 15 AND v_success >= 0.7 THEN RETURN 'legendary';
  ELSIF v_level >= 8 AND v_success >= 0.6 THEN RETURN 'hard';
  ELSIF v_level >= 3 AND v_success >= 0.5 THEN RETURN 'medium';
  ELSE RETURN 'easy';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update level when XP changes
CREATE OR REPLACE FUNCTION public.update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.current_level := public.calculate_level(NEW.total_xp);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_level
  BEFORE UPDATE ON public.user_quest_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_level();

-- Enable realtime for push_subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
