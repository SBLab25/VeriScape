import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AgentResult {
  success: boolean;
  quests?: any[];
  chain?: any;
  retired?: number;
  generated?: number;
  error?: string;
}

export function useQuestMasterAgent() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const invoke = useCallback(async (action: 'generate' | 'chain' | 'retire' | 'collaborative', location?: { lat: number; lng: number; address?: string }): Promise<AgentResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quest-master-agent', {
        body: { action, location },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const actionLabels: Record<string, string> = {
        generate: `${data.generated || 0} quests generated!`,
        chain: 'Quest chain created!',
        retire: `${data.retired || 0} stale quests retired.`,
        collaborative: 'Collaborative quest created!',
      };

      toast({ title: '🤖 Quest Master Agent', description: actionLabels[action] || 'Done!' });
      return data as AgentResult;
    } catch (e: any) {
      const msg = e.message || 'Agent failed';
      if (msg.includes('Rate limit')) {
        toast({ title: 'Rate Limited', description: 'Too many requests. Please wait a moment.', variant: 'destructive' });
      } else if (msg.includes('Payment')) {
        toast({ title: 'Credits Needed', description: 'Please add funds to continue using AI features.', variant: 'destructive' });
      } else {
        toast({ title: 'Agent Error', description: msg, variant: 'destructive' });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { invoke, loading };
}
