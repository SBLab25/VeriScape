// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useContentReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const reportContent = async (
    contentType: 'post' | 'quest' | 'comment' | 'message',
    contentId: string,
    reason: string,
    description?: string
  ) => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to report content', variant: 'destructive' });
      return false;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: user.id,
          content_type: contentType,
          content_id: contentId,
          reason,
          description: description || null,
        });
      if (error) throw error;
      toast({ title: 'Report Submitted', description: 'Thank you for helping keep the community safe.' });
      return true;
    } catch (err: any) {
      console.error('Error reporting content:', err);
      toast({ title: 'Error', description: err.message || 'Failed to submit report', variant: 'destructive' });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { reportContent, submitting };
};
