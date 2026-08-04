// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface SocialGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_emoji: string;
  banner_url?: string;
  is_public: boolean;
  max_members: number;
  owner_id: string;
  member_count: number;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { username?: string; avatar_url?: string; full_name?: string };
}

export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  image_urls: string[];
  likes_count: number;
  created_at: string;
  profile?: { username?: string; avatar_url?: string; full_name?: string };
}

const GROUP_CATEGORIES = [
  'General', 'Photography', 'Nature', 'History', 'Science', 'Adventure', 
  'Fitness', 'Art', 'Music', 'Gaming', 'Technology', 'Food'
];

export const useSocialGroups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [myGroups, setMyGroups] = useState<SocialGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('social_groups')
        .select('*')
        .order('member_count', { ascending: false });

      if (error) throw error;
      setGroups((data as any) || []);

      if (user) {
        const { data: memberships } = await supabase
          .from('social_group_members')
          .select('group_id')
          .eq('user_id', user.id);

        const memberGroupIds = (memberships || []).map((m: any) => m.group_id);
        setMyGroups(((data as any) || []).filter((g: any) => memberGroupIds.includes(g.id)));
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const createGroup = async (name: string, description: string, category: string, emoji: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('social_groups')
        .insert({ name, description, category, icon_emoji: emoji, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Auto-join as owner
      await supabase
        .from('social_group_members')
        .insert({ group_id: (data as any).id, user_id: user.id, role: 'owner' });

      toast({ title: '🎉 Group Created!', description: `"${name}" is ready for members.` });
      await fetchGroups();
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('social_group_members')
        .insert({ group_id: groupId, user_id: user.id });
      if (error) throw error;

      // Increment member count
      const group = groups.find(g => g.id === groupId);
      if (group) {
        await supabase.from('social_groups').update({ member_count: group.member_count + 1 }).eq('id', groupId);
      }

      toast({ title: 'Joined!', description: 'Welcome to the group!' });
      await fetchGroups();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Already a member', description: 'You\'re already in this group.' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('social_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
      if (error) throw error;

      const group = groups.find(g => g.id === groupId);
      if (group) {
        await supabase.from('social_groups').update({ member_count: Math.max(0, group.member_count - 1) }).eq('id', groupId);
      }

      toast({ title: 'Left group', description: 'You\'ve left the group.' });
      await fetchGroups();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const fetchGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    const { data } = await supabase
      .from('social_group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (!data) return [];

    // Fetch profiles
    const userIds = data.map((m: any) => m.user_id);
    const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url, full_name').in('id', userIds);

    return data.map((m: any) => ({
      ...m,
      profile: (profiles || []).find((p: any) => p.id === m.user_id),
    }));
  };

  const fetchGroupPosts = async (groupId: string): Promise<GroupPost[]> => {
    const { data } = await supabase
      .from('social_group_posts')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (!data) return [];

    const userIds = [...new Set(data.map((p: any) => p.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url, full_name').in('id', userIds);

    return data.map((p: any) => ({
      ...p,
      profile: (profiles || []).find((pr: any) => pr.id === p.user_id),
    }));
  };

  const createPost = async (groupId: string, content: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('social_group_posts')
        .insert({ group_id: groupId, user_id: user.id, content });
      if (error) throw error;
      toast({ title: 'Posted!', description: 'Your post is live in the group.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isMember = (groupId: string) => myGroups.some(g => g.id === groupId);

  return {
    groups, myGroups, loading, createGroup, joinGroup, leaveGroup,
    fetchGroupMembers, fetchGroupPosts, createPost, isMember,
    categories: GROUP_CATEGORIES, refresh: fetchGroups
  };
};
