
-- Create Submissions table for quest submissions
CREATE TABLE IF NOT EXISTS public."Submissions" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
  description TEXT,
  photo_url TEXT,
  geo_location TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  quest_title TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public."Submissions"(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_quest_id ON public."Submissions"(quest_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public."Submissions"(status);

-- Enable RLS
ALTER TABLE public."Submissions" ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions" ON public."Submissions"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions" ON public."Submissions"
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can create their own submissions
CREATE POLICY "Users can create submissions" ON public."Submissions"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own submissions
CREATE POLICY "Users can update own submissions" ON public."Submissions"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can update any submission
CREATE POLICY "Admins can update any submission" ON public."Submissions"
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete any submission
CREATE POLICY "Admins can delete any submission" ON public."Submissions"
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for quest submission photos
INSERT INTO storage.buckets (id, name, public) VALUES ('quest-submissions', 'quest-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload submission photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quest-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view submission photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'quest-submissions');

CREATE POLICY "Users can delete own submission photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quest-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_submissions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_submissions_updated_at
BEFORE UPDATE ON public."Submissions"
FOR EACH ROW EXECUTE FUNCTION public.update_submissions_updated_at();
