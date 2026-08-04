
-- AI Agent configuration table for storing LLM preferences
CREATE TABLE public.ai_agent_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.ai_agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read AI config"
  ON public.ai_agent_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage AI config"
  ON public.ai_agent_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default config
INSERT INTO public.ai_agent_config (config_key, config_value) VALUES
  ('llm_model', '{"provider": "lovable", "model": "google/gemini-3-flash-preview", "custom_api_key": null}'::jsonb),
  ('agent_settings', '{"auto_retire_days": 7, "max_quests_per_day": 10, "difficulty_scaling": true}'::jsonb);
