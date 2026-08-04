-- Allow all authenticated users to view approved/verified submissions in the community feed
CREATE POLICY "Anyone can view approved submissions"
ON public."Submissions"
FOR SELECT
TO authenticated
USING (status IN ('approved', 'verified'));