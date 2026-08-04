import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QuestDifficulty, DIFFICULTY_CONFIG } from '@/types/quest';

export interface UserQuestStats {
  totalCompleted: number;
  easyCompleted: number;
  mediumCompleted: number;
  hardCompleted: number;
  legendaryCompleted: number;
  totalXp: number;
  currentLevel: number;
  successRate: number;
  preferredCategory: string | null;
  xpToNextLevel: number;
  nextLevelXp: number;
  currentLevelXp: number;
}

export interface DifficultyRecommendation {
  recommended: QuestDifficulty;
  label: string;
  reason: string;
  scaledXpMultiplier: number;
}

const DEFAULT_STATS: UserQuestStats = {
  totalCompleted: 0,
  easyCompleted: 0,
  mediumCompleted: 0,
  hardCompleted: 0,
  legendaryCompleted: 0,
  totalXp: 0,
  currentLevel: 1,
  successRate: 0,
  preferredCategory: null,
  xpToNextLevel: 100,
  nextLevelXp: 100,
  currentLevelXp: 0,
};

function calculateLevelXp(level: number): number {
  // Matches the DB formula: level = floor(0.5 + sqrt(1 + 8*xp/100) / 2)
  // Inverse: xp = 100 * level * (level - 1) / 2
  return 100 * level * (level - 1) / 2;
}

function getRecommendation(level: number, successRate: number): DifficultyRecommendation {
  if (level >= 15 && successRate >= 0.7) {
    return {
      recommended: 'legendary',
      label: DIFFICULTY_CONFIG.legendary.label,
      reason: 'Your mastery and success rate qualify you for legendary challenges!',
      scaledXpMultiplier: 1.5,
    };
  }
  if (level >= 8 && successRate >= 0.6) {
    return {
      recommended: 'hard',
      label: DIFFICULTY_CONFIG.hard.label,
      reason: 'Your experience makes hard quests a great fit for growth.',
      scaledXpMultiplier: 1.3,
    };
  }
  if (level >= 3 && successRate >= 0.5) {
    return {
      recommended: 'medium',
      label: DIFFICULTY_CONFIG.medium.label,
      reason: 'Medium quests match your current skill progression.',
      scaledXpMultiplier: 1.15,
    };
  }
  return {
    recommended: 'easy',
    label: DIFFICULTY_CONFIG.easy.label,
    reason: 'Build your foundation with easier quests first.',
    scaledXpMultiplier: 1.0,
  };
}

export const useAdaptiveDifficulty = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserQuestStats>(DEFAULT_STATS);
  const [recommendation, setRecommendation] = useState<DifficultyRecommendation>(
    getRecommendation(1, 0)
  );
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_quest_stats' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching quest stats:', error);
      }

      if (data) {
        const d = data as any;
        const currentLevelXp = calculateLevelXp(d.current_level);
        const nextLevelXp = calculateLevelXp(d.current_level + 1);

        const userStats: UserQuestStats = {
          totalCompleted: d.total_completed,
          easyCompleted: d.easy_completed,
          mediumCompleted: d.medium_completed,
          hardCompleted: d.hard_completed,
          legendaryCompleted: d.legendary_completed,
          totalXp: d.total_xp,
          currentLevel: d.current_level,
          successRate: d.success_rate,
          preferredCategory: d.preferred_category,
          xpToNextLevel: nextLevelXp - d.total_xp,
          nextLevelXp,
          currentLevelXp,
        };

        setStats(userStats);
        setRecommendation(getRecommendation(d.current_level, d.success_rate));
      }
    } catch (e) {
      console.error('Error in adaptive difficulty:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const recordQuestCompletion = useCallback(
    async (difficulty: QuestDifficulty, xpEarned: number, category: string) => {
      if (!user?.id) return;

      try {
        // Try to get existing stats
        const { data: existing } = await supabase
          .from('user_quest_stats' as any)
          .select('*')
          .eq('user_id', user.id)
          .single();

        const difficultyKey = `${difficulty}_completed` as const;

        if (existing) {
          const e = existing as any;
          const newTotal = e.total_completed + 1;
          const newSuccessRate = Math.min(1, (e.success_rate * e.total_completed + 1) / newTotal);

          await supabase
            .from('user_quest_stats' as any)
            .update({
              total_completed: newTotal,
              [difficultyKey]: (e[difficultyKey] || 0) + 1,
              total_xp: e.total_xp + xpEarned,
              success_rate: newSuccessRate,
              preferred_category: category,
              last_completed_at: new Date().toISOString(),
            } as any)
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('user_quest_stats' as any)
            .insert({
              user_id: user.id,
              total_completed: 1,
              [difficultyKey]: 1,
              total_xp: xpEarned,
              success_rate: 1.0,
              preferred_category: category,
              last_completed_at: new Date().toISOString(),
            } as any);
        }

        await fetchStats();
      } catch (e) {
        console.error('Error recording quest completion:', e);
      }
    },
    [user?.id, fetchStats]
  );

  const getScaledXpReward = useCallback(
    (baseXp: number, difficulty: QuestDifficulty): number => {
      // Scale XP based on user level vs quest difficulty
      const difficultyOrder: QuestDifficulty[] = ['easy', 'medium', 'hard', 'legendary'];
      const questDiffIndex = difficultyOrder.indexOf(difficulty);
      const recDiffIndex = difficultyOrder.indexOf(recommendation.recommended);

      if (questDiffIndex > recDiffIndex) {
        // Playing above recommended = bonus XP
        return Math.round(baseXp * (1 + (questDiffIndex - recDiffIndex) * 0.15));
      }
      if (questDiffIndex < recDiffIndex) {
        // Playing below recommended = reduced XP (min 50%)
        return Math.round(baseXp * Math.max(0.5, 1 - (recDiffIndex - questDiffIndex) * 0.2));
      }
      return baseXp;
    },
    [recommendation.recommended]
  );

  return {
    stats,
    recommendation,
    loading,
    recordQuestCompletion,
    getScaledXpReward,
    refetch: fetchStats,
  };
};
