import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TeamMemberLocation {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  lat: number;
  lng: number;
  team_id?: string;
}

export const useTeamLocations = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMemberLocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setMembers([]); return; }

    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        // Find teams current user belongs to
        const { data: myMemberships, error: memErr } = await (supabase as any)
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id);
        if (memErr) throw memErr;
        const teamIds = (myMemberships || []).map((m: any) => m.team_id);
        if (teamIds.length === 0) { setMembers([]); return; }

        // Get other members of those teams with profile info
        const { data: teamMembers, error: membersErr } = await (supabase as any)
          .from('team_members')
          .select('user_id, team_id, profiles:profiles(id, username, avatar_url, latitude, longitude)')
          .in('team_id', teamIds);
        if (membersErr) throw membersErr;

        const mapped = (teamMembers || [])
          .filter((m: any) => m.profiles && m.profiles.id !== user.id && m.profiles.latitude && m.profiles.longitude)
          .map((m: any) => ({
            id: m.profiles.id,
            username: m.profiles.username,
            avatar_url: m.profiles.avatar_url,
            lat: m.profiles.latitude,
            lng: m.profiles.longitude,
            team_id: m.team_id,
          })) as TeamMemberLocation[];

        setMembers(mapped);
      } catch (e) {
        console.error('Failed to fetch team locations', e);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();

    // Realtime updates: listen to profile location changes
    const channel = supabase
      .channel('team-profiles-location')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const rec: any = payload.new;
          setMembers((prev) => {
            const idx = prev.findIndex((p) => p.id === rec.id);
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], lat: rec.latitude, lng: rec.longitude };
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { members, loading };
};
