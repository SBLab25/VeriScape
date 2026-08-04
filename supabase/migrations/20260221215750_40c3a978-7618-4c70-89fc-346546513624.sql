
-- =====================================================
-- ENHANCED AI VERIFICATION AGENT - COMPLETE SCHEMA
-- =====================================================

-- 1. Core ai_verifications table (was missing from Cloud DB)
CREATE TABLE IF NOT EXISTS public.ai_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quest_id uuid,
  submission_id uuid NOT NULL,
  photo_url text NOT NULL,
  quest_match_score numeric(3,2) CHECK (quest_match_score >= 0 AND quest_match_score <= 1),
  geolocation_match_score numeric(3,2) CHECK (geolocation_match_score >= 0 AND geolocation_match_score <= 1),
  authenticity_score numeric(3,2) CHECK (authenticity_score >= 0 AND authenticity_score <= 1),
  scene_relevance_score numeric(3,2) CHECK (scene_relevance_score >= 0 AND scene_relevance_score <= 1),
  final_confidence numeric(3,2) CHECK (final_confidence >= 0 AND final_confidence <= 1),
  verdict text CHECK (verdict IN ('verified', 'uncertain', 'rejected')) NOT NULL,
  reason text NOT NULL,
  exif_latitude numeric,
  exif_longitude numeric,
  exif_timestamp timestamptz,
  model_used text DEFAULT 'gemini-2.5-pro',
  admin_override boolean DEFAULT false,
  admin_override_by uuid,
  admin_override_reason text,
  deepfake_verdict text,
  deepfake_confidence numeric(3,2),
  analysis_report text,
  analyzed_at timestamptz,
  -- Enhanced agent columns
  agent_scores jsonb DEFAULT '{}'::jsonb,
  agent_explanations jsonb DEFAULT '[]'::jsonb,
  verification_stage text DEFAULT 'initial',
  appeal_count integer DEFAULT 0,
  cross_reference_flags integer DEFAULT 0,
  feedback_applied boolean DEFAULT false,
  verified_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications"
  ON public.ai_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications"
  ON public.ai_verifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert verifications"
  ON public.ai_verifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update verifications"
  ON public.ai_verifications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ai_verif_user ON public.ai_verifications(user_id);
CREATE INDEX idx_ai_verif_submission ON public.ai_verifications(submission_id);
CREATE INDEX idx_ai_verif_verdict ON public.ai_verifications(verdict);

-- 2. AI logs table
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  verification_id uuid REFERENCES public.ai_verifications(id) ON DELETE CASCADE,
  model_used text NOT NULL,
  confidence_score numeric(3,2),
  execution_time_ms integer,
  status text CHECK (status IN ('success', 'error', 'timeout')) NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON public.ai_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs"
  ON public.ai_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert logs"
  ON public.ai_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Verification Appeals table
CREATE TABLE IF NOT EXISTS public.verification_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.ai_verifications(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL,
  user_id uuid NOT NULL,
  appeal_reason text NOT NULL,
  appeal_status text NOT NULL DEFAULT 'pending' CHECK (appeal_status IN ('pending', 'reviewing', 'approved', 'denied')),
  ai_review_result jsonb,
  ai_review_verdict text CHECK (ai_review_verdict IN ('uphold', 'overturn', 'escalate')),
  ai_review_confidence numeric(3,2) CHECK (ai_review_confidence >= 0 AND ai_review_confidence <= 1),
  ai_review_reason text,
  admin_decision text CHECK (admin_decision IN ('approved', 'denied')),
  admin_reason text,
  admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  resolved_at timestamptz
);

ALTER TABLE public.verification_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appeals"
  ON public.verification_appeals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create appeals"
  ON public.verification_appeals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all appeals"
  ON public.verification_appeals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update appeals"
  ON public.verification_appeals FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_appeals_user ON public.verification_appeals(user_id);
CREATE INDEX idx_appeals_status ON public.verification_appeals(appeal_status);
CREATE INDEX idx_appeals_verif ON public.verification_appeals(verification_id);

-- 4. Adaptive thresholds table
CREATE TABLE IF NOT EXISTS public.verification_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_key text NOT NULL UNIQUE,
  threshold_value numeric(4,3) NOT NULL,
  sample_count integer NOT NULL DEFAULT 0,
  last_adjusted_at timestamptz DEFAULT now(),
  adjustment_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read thresholds"
  ON public.verification_thresholds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage thresholds"
  ON public.verification_thresholds FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.verification_thresholds (threshold_key, threshold_value, sample_count) VALUES
  ('verify_min_confidence', 0.750, 0),
  ('reject_max_confidence', 0.400, 0),
  ('appeal_auto_approve_confidence', 0.800, 0),
  ('cross_reference_similarity', 0.850, 0)
ON CONFLICT (threshold_key) DO NOTHING;

-- 5. Cross-reference tracking
CREATE TABLE IF NOT EXISTS public.verification_cross_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_verification_id uuid NOT NULL REFERENCES public.ai_verifications(id) ON DELETE CASCADE,
  target_verification_id uuid NOT NULL REFERENCES public.ai_verifications(id) ON DELETE CASCADE,
  similarity_score numeric(3,2) CHECK (similarity_score >= 0 AND similarity_score <= 1),
  similarity_type text NOT NULL CHECK (similarity_type IN ('visual', 'location', 'user_pattern', 'quest')),
  flagged boolean DEFAULT false,
  flag_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_cross_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cross refs"
  ON public.verification_cross_references FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_crossref_source ON public.verification_cross_references(source_verification_id);
CREATE INDEX idx_crossref_target ON public.verification_cross_references(target_verification_id);

-- 6. Verification feedback (learning loop)
CREATE TABLE IF NOT EXISTS public.verification_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.ai_verifications(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  original_verdict text NOT NULL,
  corrected_verdict text NOT NULL,
  original_confidence numeric(3,2),
  feedback_notes text,
  score_adjustments jsonb,
  applied_to_thresholds boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feedback"
  ON public.verification_feedback FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_feedback_verif ON public.verification_feedback(verification_id);

-- Enable realtime for appeals (so admin sees new appeals live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_appeals;
