// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Grid3X3, Type, Dumbbell, CheckCircle2 } from 'lucide-react';
import { SudokuGame } from './SudokuGame';
import { WordGame } from './WordGame';
import { useAuth } from '@/hooks/useAuth';
import { usePoints } from '@/hooks/usePoints';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getISTDateString } from '@/utils/timezoneUtils';

interface DailyChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userLevel?: number;
  showExercises?: boolean;
}

export const DailyChallengeDialog: React.FC<DailyChallengeDialogProps> = ({
  open,
  onOpenChange,
  userLevel = 1,
  showExercises = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addExerciseQuotaPoints } = usePoints();
  const [completedGames, setCompletedGames] = useState<Set<string>>(new Set());
  const [defaultTab, setDefaultTab] = useState(showExercises ? 'exercises' : 'sudoku');

  useEffect(() => {
    if (open && user) {
      loadCompletionStatus();
    }
  }, [open, user]);

  useEffect(() => {
    setDefaultTab(showExercises ? 'exercises' : 'sudoku');
  }, [showExercises]);

  const loadCompletionStatus = async () => {
    if (!user) return;
    const today = getISTDateString();
    const key = `daily_games_${user.id}_${today}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setCompletedGames(new Set(JSON.parse(stored)));
    }
  };

  const markGameComplete = (game: string, timeSeconds: number) => {
    if (!user) return;
    const today = getISTDateString();
    const key = `daily_games_${user.id}_${today}`;

    const newCompleted = new Set(completedGames);
    newCompleted.add(game);
    setCompletedGames(newCompleted);
    localStorage.setItem(key, JSON.stringify(Array.from(newCompleted)));

    // Award points
    addExerciseQuotaPoints();

    toast({
      title: `🎉 ${game === 'sudoku' ? 'Sudoku' : 'Word Game'} Complete!`,
      description: `You earned bonus points! Time: ${Math.floor(timeSeconds / 60)}:${(timeSeconds % 60).toString().padStart(2, '0')}`,
    });

    // Save to daily_exercises
    saveToDailyExercises(game);
  };

  const saveToDailyExercises = async (game: string) => {
    if (!user) return;
    try {
      const today = getISTDateString();
      const { data: existing } = await supabase
        .from('daily_exercises')
        .select('exercises_completed')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      const current = existing?.exercises_completed || [];
      const updated = [...new Set([...current, `game_${game}`])];

      await supabase
        .from('daily_exercises')
        .upsert({
          user_id: user.id,
          date: today,
          exercises_completed: updated,
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,date' });
    } catch (err) {
      console.error('Error saving game completion:', err);
    }
  };

  const isSudokuDone = completedGames.has('sudoku');
  const isWordDone = completedGames.has('word');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Daily Brain Challenge
          </DialogTitle>
          <DialogDescription>
            Complete today's unique puzzles to earn bonus points! Difficulty adapts to your level.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={defaultTab} onValueChange={setDefaultTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sudoku" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Sudoku
              {isSudokuDone && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="word" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Word Game
              {isWordDone && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sudoku" className="mt-4">
            {isSudokuDone ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-bold">Today's Sudoku Complete!</h3>
                <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle.</p>
              </div>
            ) : (
              <SudokuGame
                userLevel={userLevel}
                onComplete={(time) => markGameComplete('sudoku', time)}
              />
            )}
          </TabsContent>

          <TabsContent value="word" className="mt-4">
            {isWordDone ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-bold">Today's Word Game Complete!</h3>
                <p className="text-sm text-muted-foreground">Come back tomorrow for a new word.</p>
              </div>
            ) : (
              <WordGame
                userLevel={userLevel}
                onComplete={(time) => markGameComplete('word', time)}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Status */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-1 text-sm">
            <div className={cn_status(isSudokuDone)} />
            Sudoku
          </div>
          <div className="flex items-center gap-1 text-sm">
            <div className={cn_status(isWordDone)} />
            Word Game
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function cn_status(done: boolean) {
  return `w-2 h-2 rounded-full ${done ? 'bg-green-500' : 'bg-muted-foreground/30'}`;
}
