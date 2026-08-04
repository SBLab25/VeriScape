// @ts-nocheck
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ARMarker {
  id: string;
  title: string;
  description: string;
  marker_type: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  ar_overlay_emoji: string;
  xp_reward: number;
  is_active: boolean;
  collected_count: number;
  is_local?: boolean; // generated around user
}

export interface UserARCollection {
  id: string;
  user_id: string;
  marker_id: string;
  collected_at: string;
}

// Predefined local marker templates that spawn around the user
const LOCAL_MARKER_TEMPLATES = [
  { title: 'Hidden Gem', description: 'A sparkling gem hidden nearby — grab it!', marker_type: 'collectible', ar_overlay_emoji: '💎', xp_reward: 30 },
  { title: 'Ancient Scroll', description: 'An ancient scroll with lost knowledge.', marker_type: 'puzzle', ar_overlay_emoji: '📜', xp_reward: 40 },
  { title: 'Star Fragment', description: 'A piece of a fallen star, still glowing.', marker_type: 'collectible', ar_overlay_emoji: '⭐', xp_reward: 25 },
  { title: 'Mystery Box', description: 'What could be inside? Open to find out.', marker_type: 'collectible', ar_overlay_emoji: '🎁', xp_reward: 35 },
  { title: 'Fire Crystal', description: 'A rare crystal pulsing with energy.', marker_type: 'challenge', ar_overlay_emoji: '🔥', xp_reward: 50 },
  { title: 'Enchanted Feather', description: 'A magical feather floating in the breeze.', marker_type: 'collectible', ar_overlay_emoji: '🪶', xp_reward: 20 },
  { title: 'Treasure Chest', description: 'A small chest buried just beneath the surface.', marker_type: 'collectible', ar_overlay_emoji: '🏴‍☠️', xp_reward: 45 },
  { title: 'Runic Stone', description: 'Solve the rune to unlock its power.', marker_type: 'puzzle', ar_overlay_emoji: '🪨', xp_reward: 40 },
  { title: 'Golden Compass', description: 'Points toward the next great adventure.', marker_type: 'collectible', ar_overlay_emoji: '🧭', xp_reward: 30 },
  { title: 'Shadow Orb', description: 'A dark orb radiating mysterious energy.', marker_type: 'challenge', ar_overlay_emoji: '🔮', xp_reward: 55 },
  { title: 'Lucky Clover', description: 'Said to bring fortune to whoever finds it.', marker_type: 'collectible', ar_overlay_emoji: '🍀', xp_reward: 20 },
  { title: 'Dragon Scale', description: 'A shimmering scale from a legendary beast.', marker_type: 'challenge', ar_overlay_emoji: '🐉', xp_reward: 60 },
];

/**
 * Generate a deterministic seed from lat/lng so the same area always
 * shows the same markers (avoids markers moving on re-render).
 */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateLocalMarkers(lat: number, lng: number): ARMarker[] {
  // Round to ~100m grid so markers stay stable while user is in the same area
  const gridLat = Math.round(lat * 1000) / 1000;
  const gridLng = Math.round(lng * 1000) / 1000;
  const seed = Math.abs(Math.round(gridLat * 10000 + gridLng * 10000));
  const rng = seededRandom(seed);

  return LOCAL_MARKER_TEMPLATES.map((template, i) => {
    // Spread markers 30–300m around the user in random directions
    const angle = rng() * 2 * Math.PI;
    const distance = 30 + rng() * 270; // 30-300 meters
    const offsetLat = (distance / 111320) * Math.cos(angle);
    const offsetLng = (distance / (111320 * Math.cos(lat * (Math.PI / 180)))) * Math.sin(angle);

    return {
      id: `local-${i}-${seed}`,
      ...template,
      latitude: lat + offsetLat,
      longitude: lng + offsetLng,
      radius_meters: 500, // generous collect radius
      is_active: true,
      collected_count: 0,
      is_local: true,
    };
  });
}

export const useARQuest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dbMarkers, setDbMarkers] = useState<ARMarker[]>([]);
  const [collections, setCollections] = useState<UserARCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [localCollections, setLocalCollections] = useState<Set<string>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

  // Load locally collected markers from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ar_local_collections');
      if (saved) setLocalCollections(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const fetchMarkers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ar_quest_markers')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setDbMarkers((data as any) || []);

      if (user) {
        const { data: collData } = await supabase
          .from('user_ar_collections')
          .select('*')
          .eq('user_id', user.id);
        setCollections((collData as any) || []);
      }
    } catch (error) {
      console.error('Error fetching AR markers:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchMarkers(); }, [fetchMarkers]);

  // Generate local markers whenever user location updates
  const localMarkers = useMemo(() => {
    if (!userLocation) return [];
    return generateLocalMarkers(userLocation.lat, userLocation.lng);
  }, [userLocation]);

  // Combine DB markers + locally generated markers
  const markers = useMemo(() => [...localMarkers, ...dbMarkers], [localMarkers, dbMarkers]);

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: 'Error', description: 'Geolocation not supported', variant: 'destructive' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast({ title: '📍 Location Updated', description: 'AR markers generated around you!' });
      },
      (err) => toast({ title: 'Location Error', description: err.message, variant: 'destructive' }),
      { enableHighAccuracy: true }
    );
  }, [toast]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getNearbyMarkers = useCallback(() => {
    if (!userLocation) return [];
    return markers.filter(m => {
      const dist = getDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude);
      return dist <= m.radius_meters;
    });
  }, [userLocation, markers]);

  const isCollected = (markerId: string) => {
    if (markerId.startsWith('local-')) return localCollections.has(markerId);
    return collections.some(c => c.marker_id === markerId);
  };

  const collectMarker = async (markerId: string) => {
    if (!user) return;

    const marker = markers.find(m => m.id === markerId);
    if (!marker) return;

    // Handle local markers (persist in localStorage)
    if (markerId.startsWith('local-')) {
      const updated = new Set(localCollections);
      updated.add(markerId);
      setLocalCollections(updated);
      localStorage.setItem('ar_local_collections', JSON.stringify([...updated]));
      toast({ title: `${marker.ar_overlay_emoji} Collected!`, description: `+${marker.xp_reward} XP earned!` });
      return;
    }

    // Handle DB markers
    try {
      const { error } = await supabase
        .from('user_ar_collections')
        .insert({ user_id: user.id, marker_id: markerId });
      if (error) throw error;

      toast({ title: `${marker.ar_overlay_emoji} Collected!`, description: `+${marker.xp_reward} XP earned!` });
      await fetchMarkers();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Already collected', description: "You've already collected this marker." });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraActive(true);
      return stream;
    } catch (error) {
      toast({ title: 'Camera Error', description: 'Could not access camera', variant: 'destructive' });
      return null;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  return {
    markers, collections, loading, userLocation, cameraActive,
    getUserLocation, getNearbyMarkers, isCollected, collectMarker,
    startCamera, stopCamera, getDistance, refresh: fetchMarkers
  };
};
