// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchBlocked();
  }, [user]);

  const fetchBlocked = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      if (error) throw error;
      setBlockedIds(data?.map(b => b.blocked_id) || []);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = (userId: string) => blockedIds.includes(userId);

  const blockUser = async (userId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: userId });
      if (error) throw error;
      setBlockedIds(prev => [...prev, userId]);
      toast({ title: 'User Blocked', description: 'This user has been blocked.' });
    } catch (err: any) {
      console.error('Error blocking user:', err);
      toast({ title: 'Error', description: err.message || 'Failed to block user', variant: 'destructive' });
    }
  };

  const unblockUser = async (userId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);
      if (error) throw error;
      setBlockedIds(prev => prev.filter(id => id !== userId));
      toast({ title: 'User Unblocked', description: 'This user has been unblocked.' });
    } catch (err: any) {
      console.error('Error unblocking user:', err);
      toast({ title: 'Error', description: err.message || 'Failed to unblock user', variant: 'destructive' });
    }
  };

  const toggleBlock = async (userId: string) => {
    if (isBlocked(userId)) {
      await unblockUser(userId);
    } else {
      await blockUser(userId);
    }
  };

  return { blockedIds, isBlocked, blockUser, unblockUser, toggleBlock, loading, refetch: fetchBlocked };
};
