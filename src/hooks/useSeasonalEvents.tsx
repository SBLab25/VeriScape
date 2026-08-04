// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  theme: string;
  season: string;
  banner_url?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  reward_type?: string;
  reward_value?: number;
  xp_multiplier: number;
  quests?: SeasonalQuest[];
}

export interface SeasonalQuest {
  id: string;
  event_id: string;
  title: string;
  description: string;
  difficulty: string;
  xp_reward: number;
  objectives: any[];
  theme_tag?: string;
}

export interface EventParticipation {
  id: string;
  user_id: string;
  event_id: string;
  quest_id?: string;
  status: string;
  points_earned: number;
  completed_at?: string;
}

export const useSeasonalEvents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<SeasonalEvent[]>([]);
  const [participation, setParticipation] = useState<EventParticipation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();

      const { data: eventsData, error } = await supabase
        .from('seasonal_events')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('end_date', { ascending: true });

      if (error) throw error;

      // Fetch quests for each event
      const eventIds = (eventsData || []).map((e: any) => e.id);
      const { data: questsData } = await supabase
        .from('seasonal_event_quests')
        .select('*')
        .in('event_id', eventIds.length > 0 ? eventIds : ['none']);

      // Fetch participation
      if (user) {
        const { data: partData } = await supabase
          .from('seasonal_event_participation')
          .select('*')
          .eq('user_id', user.id);
        setParticipation((partData as any) || []);
      }

      const eventsWithQuests = (eventsData || []).map((event: any) => ({
        ...event,
        quests: (questsData || []).filter((q: any) => q.event_id === event.id),
      }));

      setEvents(eventsWithQuests);
    } catch (error) {
      console.error('Error fetching seasonal events:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const joinEvent = async (eventId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('seasonal_event_participation')
        .insert({ user_id: user.id, event_id: eventId, quest_id: null });
      if (error) throw error;
      toast({ title: '🎉 Joined Event!', description: 'You\'ve joined the seasonal event.' });
      await fetchEvents();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Already joined', description: 'You\'re already participating in this event.' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }
  };

  const completeEventQuest = async (eventId: string, questId: string, xpEarned: number) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('seasonal_event_participation')
        .upsert({
          user_id: user.id,
          event_id: eventId,
          quest_id: questId,
          status: 'completed',
          points_earned: xpEarned,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,event_id,quest_id' });
      if (error) throw error;
      toast({ title: '✅ Quest Completed!', description: `Earned ${xpEarned} XP!` });
      await fetchEvents();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isJoined = (eventId: string) => participation.some(p => p.event_id === eventId && !p.quest_id);
  const isQuestCompleted = (questId: string) => participation.some(p => p.quest_id === questId && p.status === 'completed');

  const getTimeRemaining = (endDate: string) => {
    const remaining = new Date(endDate).getTime() - Date.now();
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours, expired: remaining <= 0 };
  };

  return { events, participation, loading, joinEvent, completeEventQuest, isJoined, isQuestCompleted, getTimeRemaining, refresh: fetchEvents };
};
