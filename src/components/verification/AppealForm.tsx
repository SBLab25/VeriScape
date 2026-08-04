// @ts-nocheck
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/utils/edgeFunctionClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Gavel, Loader2 } from 'lucide-react';

interface AppealFormProps {
  verificationId: string;
  submissionId: string;
  currentVerdict: 'verified' | 'uncertain' | 'rejected';
  currentConfidence: number;
  photoUrl: string;
  questTitle: string;
  questDescription: string;
  onAppealSubmitted?: () => void;
}

export const AppealForm: React.FC<AppealFormProps> = ({
  verificationId,
  submissionId,
  currentVerdict,
  currentConfidence,
  photoUrl,
  questTitle,
  questDescription,
  onAppealSubmitted,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitAppeal = async () => {
    if (!user || !reason.trim()) {
      toast({ title: 'Missing Info', description: 'Please explain why you disagree with the verdict.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Create appeal record
      const { error: insertError } = await supabase
        .from('verification_appeals' as any)
        .insert({
          verification_id: verificationId,
          submission_id: submissionId,
          user_id: user.id,
          appeal_reason: reason,
          appeal_status: 'pending',
        });

      if (insertError) throw insertError;

      // Trigger AI review
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const { error: fnError } = await invokeEdgeFunction('ai-verification-agent', {
          action: 'appeal_review',
          appealId: '',
          verificationId,
          appealReason: reason,
          photoUrl,
          questTitle,
          questDescription,
      }, token);

      if (fnError) console.warn('AI review trigger failed, admin will review manually:', fnError);

      // Update appeal count
      await supabase.from('ai_verifications' as any)
        .update({ appeal_count: 1 } as any)
        .eq('id', verificationId);

      toast({ title: 'Appeal Submitted', description: 'Your appeal is being reviewed by our AI agent and admin team.' });
      setSubmitted(true);
      onAppealSubmitted?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to submit appeal', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-blue-500">
            <Gavel className="h-5 w-5" />
            <span className="font-medium">Appeal submitted! You'll be notified of the decision.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentVerdict === 'verified') return null;

  return (
    <Card className="border-orange-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gavel className="h-5 w-5" />
          Appeal This Decision
        </CardTitle>
        <CardDescription>
          Current verdict: <Badge variant="outline" className="capitalize ml-1">{currentVerdict}</Badge> ({Math.round(currentConfidence * 100)}% confidence)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Explain why you believe this decision is incorrect. Include any relevant details about your photo or quest completion..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-[100px]"
        />
        <Button onClick={handleSubmitAppeal} disabled={submitting || !reason.trim()} className="w-full">
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting Appeal...</> : 'Submit Appeal'}
        </Button>
      </CardContent>
    </Card>
  );
};
