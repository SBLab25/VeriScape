import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { DIFFICULTY_CONFIG } from '@/types/quest';
import { TrendingUp, Zap, Target, Star, Shield, Flame, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const LEVEL_TITLES: Record<number, string> = {
  1: 'Novice',
  2: 'Apprentice',
  3: 'Explorer',
  5: 'Adventurer',
  8: 'Veteran',
  12: 'Champion',
  15: 'Legend',
  20: 'Mythic',
};

function getLevelTitle(level: number): string {
  let title = 'Novice';
  for (const [threshold, name] of Object.entries(LEVEL_TITLES)) {
    if (level >= Number(threshold)) title = name;
  }
  return title;
}

const difficultyIcons: Record<string, React.ReactNode> = {
  easy: <Shield className="h-4 w-4" />,
  medium: <Target className="h-4 w-4" />,
  hard: <Flame className="h-4 w-4" />,
  legendary: <Sparkles className="h-4 w-4" />,
};

const difficultyColors: Record<string, string> = {
  easy: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  hard: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  legendary: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
};

export const AdaptiveDifficultyPanel = () => {
  const { stats, recommendation, loading } = useAdaptiveDifficulty();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const levelTitle = getLevelTitle(stats.currentLevel);
  const xpProgress = stats.nextLevelXp > stats.currentLevelXp
    ? ((stats.totalXp - stats.currentLevelXp) / (stats.nextLevelXp - stats.currentLevelXp)) * 100
    : 100;

  return (
    <Card className="border-primary/20 overflow-hidden">
      {/* Level Header */}
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-primary" />
              Adaptive Difficulty
            </CardTitle>
            <CardDescription>
              Quests scale to match your skill level
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-2xl font-bold">{stats.currentLevel}</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">{levelTitle}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {/* XP Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Level Progress</span>
            <span className="font-medium text-primary">
              {stats.totalXp.toLocaleString()} XP
            </span>
          </div>
          <Progress value={xpProgress} className="h-2.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Level {stats.currentLevel}</span>
            <span>{stats.xpToNextLevel > 0 ? `${stats.xpToNextLevel} XP to next` : 'Max level!'}</span>
          </div>
        </div>

        {/* Recommended Difficulty */}
        <div className={`rounded-lg border p-4 ${difficultyColors[recommendation.recommended]}`}>
          <div className="flex items-center gap-2 mb-2">
            {difficultyIcons[recommendation.recommended]}
            <span className="font-semibold text-sm">Recommended: {recommendation.label}</span>
            {recommendation.scaledXpMultiplier > 1 && (
              <Badge variant="outline" className="text-xs ml-auto">
                +{Math.round((recommendation.scaledXpMultiplier - 1) * 100)}% XP Bonus
              </Badge>
            )}
          </div>
          <p className="text-xs opacity-80">{recommendation.reason}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
            <div className="text-xs text-muted-foreground">Quests Done</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="text-2xl font-bold">{Math.round(stats.successRate * 100)}%</div>
            <div className="text-xs text-muted-foreground">Success Rate</div>
          </div>
        </div>

        {/* Difficulty Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Completion Breakdown
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {(['easy', 'medium', 'hard', 'legendary'] as const).map((diff) => {
              const count = stats[`${diff}Completed` as keyof typeof stats] as number;
              const config = DIFFICULTY_CONFIG[diff];
              return (
                <div key={diff} className="text-center rounded-md bg-muted/30 p-2">
                  <div className={`text-lg font-bold ${config.color}`}>{count}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{config.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
