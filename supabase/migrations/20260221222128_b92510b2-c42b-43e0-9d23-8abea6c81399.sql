
-- Fix RLS policies on ai_verifications: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Admins can update verifications" ON public.ai_verifications;
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.ai_verifications;
DROP POLICY IF EXISTS "Authenticated can insert verifications" ON public.ai_verifications;
DROP POLICY IF EXISTS "Users can view own verifications" ON public.ai_verifications;

CREATE POLICY "Admins can view all verifications" ON public.ai_verifications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own verifications" ON public.ai_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert verifications" ON public.ai_verifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update verifications" ON public.ai_verifications FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS on ai_logs
DROP POLICY IF EXISTS "Admins can view all logs" ON public.ai_logs;
DROP POLICY IF EXISTS "Users can view own logs" ON public.ai_logs;
DROP POLICY IF EXISTS "Authenticated can insert logs" ON public.ai_logs;

CREATE POLICY "Admins can view all logs" ON public.ai_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own logs" ON public.ai_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert logs" ON public.ai_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Fix RLS on verification_appeals
DROP POLICY IF EXISTS "Admins can view all appeals" ON public.verification_appeals;
DROP POLICY IF EXISTS "Users can view own appeals" ON public.verification_appeals;
DROP POLICY IF EXISTS "Users can create appeals" ON public.verification_appeals;
DROP POLICY IF EXISTS "Admins can update appeals" ON public.verification_appeals;

CREATE POLICY "Admins can view all appeals" ON public.verification_appeals FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own appeals" ON public.verification_appeals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create appeals" ON public.verification_appeals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update appeals" ON public.verification_appeals FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS on verification_thresholds
DROP POLICY IF EXISTS "Admins can manage thresholds" ON public.verification_thresholds;
DROP POLICY IF EXISTS "Anyone can read thresholds" ON public.verification_thresholds;

CREATE POLICY "Admins can manage thresholds" ON public.verification_thresholds FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read thresholds" ON public.verification_thresholds FOR SELECT TO authenticated USING (true);

-- Fix RLS on verification_feedback
DROP POLICY IF EXISTS "Admins can manage feedback" ON public.verification_feedback;

CREATE POLICY "Admins can manage feedback" ON public.verification_feedback FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS on verification_cross_references
DROP POLICY IF EXISTS "Admins can manage cross refs" ON public.verification_cross_references;

CREATE POLICY "Admins can manage cross refs" ON public.verification_cross_references FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
