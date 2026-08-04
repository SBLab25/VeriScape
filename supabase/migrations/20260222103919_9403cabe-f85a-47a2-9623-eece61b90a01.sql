
-- Quest Knowledge Agent conversation history
CREATE TABLE public.quest_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quest_id UUID NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON public.quest_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Learning engagement tracking
CREATE TABLE public.quest_learning_engagement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fact_category TEXT NOT NULL,
  engagement_count INTEGER NOT NULL DEFAULT 1,
  quiz_score_avg REAL NULL,
  preferred_depth TEXT NOT NULL DEFAULT 'medium',
  last_engaged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_learning_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own learning data"
  ON public.quest_learning_engagement FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_quest_conversations_user ON public.quest_conversations(user_id);
CREATE INDEX idx_quest_conversations_quest ON public.quest_conversations(quest_id);
CREATE INDEX idx_quest_learning_user ON public.quest_learning_engagement(user_id);
CREATE UNIQUE INDEX idx_quest_learning_unique ON public.quest_learning_engagement(user_id, fact_category);
