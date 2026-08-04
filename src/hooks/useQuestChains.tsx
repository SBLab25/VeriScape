// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface QuestChain {
  id: string;
  title: string;
  description: string;
  storyline?: string;
  difficulty: string;
  total_steps: number;
  total_xp_reward: number;
  bonus_reward_type?: string;
  bonus_reward_value?: number;
  category: string;
  is_active: boolean;
  steps?: QuestChainStep[];
}

export interface QuestChainStep {
  id: string;
  chain_id: string;
  step_number: number;
  title: string;
  description: string;
  narrative?: string;
  objectives: any[];
  xp_reward: number;
  unlock_condition: string;
}

export interface UserChainProgress {
  id: string;
  user_id: string;
  chain_id: string;
  current_step: number;
  status: string;
  steps_completed: number[];
  started_at: string;
  completed_at?: string;
}

export const useQuestChains = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chains, setChains] = useState<QuestChain[]>([]);
  const [progress, setProgress] = useState<UserChainProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChains = useCallback(async () => {
    try {
      setLoading(true);
      const { data: chainsData, error } = await supabase
        .from('quest_chains')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const chainIds = (chainsData || []).map((c: any) => c.id);
      const { data: stepsData } = await supabase
        .from('quest_chain_steps')
        .select('*')
        .in('chain_id', chainIds.length > 0 ? chainIds : ['none'])
        .order('step_number', { ascending: true });

      if (user) {
        const { data: progressData } = await supabase
          .from('user_quest_chain_progress')
          .select('*')
          .eq('user_id', user.id);
        setProgress((progressData as any) || []);
      }

      const chainsWithSteps = (chainsData || []).map((chain: any) => ({
        ...chain,
        steps: (stepsData || []).filter((s: any) => s.chain_id === chain.id),
      }));

      setChains(chainsWithSteps);
    } catch (error) {
      console.error('Error fetching quest chains:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChains();
  }, [fetchChains]);

  const startChain = async (chainId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_quest_chain_progress')
        .insert({ user_id: user.id, chain_id: chainId, current_step: 1, status: 'in_progress', steps_completed: [] });
      if (error) throw error;
      toast({ title: '🗺️ Quest Chain Started!', description: 'Your adventure begins now.' });
      await fetchChains();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Already started', description: 'You\'re already on this quest chain.' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }
  };

  const completeStep = async (chainId: string, stepNumber: number) => {
    if (!user) return;
    try {
      const userProgress = progress.find(p => p.chain_id === chainId);
      if (!userProgress) return;

      const chain = chains.find(c => c.id === chainId);
      if (!chain) return;

      const newCompleted = [...(userProgress.steps_completed || []), stepNumber];
      const isChainComplete = stepNumber >= chain.total_steps;

      const { error } = await supabase
        .from('user_quest_chain_progress')
        .update({
          current_step: isChainComplete ? stepNumber : stepNumber + 1,
          steps_completed: newCompleted,
          status: isChainComplete ? 'completed' : 'in_progress',
          completed_at: isChainComplete ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userProgress.id);

      if (error) throw error;

      const step = chain.steps?.find(s => s.step_number === stepNumber);
      toast({ 
        title: isChainComplete ? '🏆 Chain Complete!' : '✅ Step Complete!', 
        description: isChainComplete 
          ? `Earned ${chain.total_xp_reward} total XP!` 
          : `Step ${stepNumber} done! +${step?.xp_reward || 0} XP. Next: Step ${stepNumber + 1}` 
      });
      await fetchChains();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getChainProgress = (chainId: string) => progress.find(p => p.chain_id === chainId);
  const isStepCompleted = (chainId: string, stepNumber: number) => {
    const p = progress.find(pr => pr.chain_id === chainId);
    return p?.steps_completed?.includes(stepNumber) || false;
  };

  return { chains, progress, loading, startChain, completeStep, getChainProgress, isStepCompleted, refresh: fetchChains };
};
