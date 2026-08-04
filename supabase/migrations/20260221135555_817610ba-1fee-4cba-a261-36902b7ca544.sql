
-- Create quests table
CREATE TABLE public.quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'general',
  xp_reward INTEGER NOT NULL DEFAULT 100,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS but allow public read/write for now (no auth)
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quests" ON public.quests FOR SELECT USING (true);
CREATE POLICY "Anyone can create quests" ON public.quests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quests" ON public.quests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quests" ON public.quests FOR DELETE USING (true);
