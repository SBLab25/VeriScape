// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface QuestRoute {
  id: string;
  name: string;
  description?: string;
  quest_ids: string[];
  color: string;
  is_public: boolean;
  total_distance_km?: number;
  estimated_time_minutes?: number;
  created_at: string;
}

export const useQuestRoutes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [routes, setRoutes] = useState<QuestRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutes();
  }, [user]);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('quest_routes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRoutes(data || []);
    } catch (err) {
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRoute = async (name: string, questIds: string[], color: string, isPublic: boolean) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('quest_routes')
        .insert({ user_id: user.id, name, quest_ids: questIds, color, is_public: isPublic })
        .select()
        .single();
      if (error) throw error;
      setRoutes(prev => [data, ...prev]);
      toast({ title: 'Route Created', description: `"${name}" route has been saved.` });
      return data;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create route', variant: 'destructive' });
      return null;
    }
  };

  const deleteRoute = async (routeId: string) => {
    try {
      const { error } = await supabase.from('quest_routes').delete().eq('id', routeId);
      if (error) throw error;
      setRoutes(prev => prev.filter(r => r.id !== routeId));
      toast({ title: 'Route Deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete route', variant: 'destructive' });
    }
  };

  return { routes, loading, createRoute, deleteRoute, refetch: fetchRoutes };
};
