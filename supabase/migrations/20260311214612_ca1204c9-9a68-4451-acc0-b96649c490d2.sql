CREATE POLICY "Admins can delete verifications"
ON public.ai_verifications FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));