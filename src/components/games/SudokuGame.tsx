// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, RotateCcw, Lightbulb, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SudokuGameProps {
  userLevel?: number;
  onComplete: (timeSeconds: number) => void;
}

// Seeded random number generator for daily unique puzzles
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

// Generate a valid completed Sudoku board
function generateSolvedBoard(rng: () => number): number[][] {
  const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));

  function isValid(board: number[][], row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = boxRow; i < boxRow + 3; i++) {
      for (let j = boxCol; j < boxCol + 3; j++) {
        if (board[i][j] === num) return false;
      }
    }
    return true;
  }

  function solve(board: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => rng() - 0.5);
          for (const num of nums) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              if (solve(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  solve(board);
  return board;
}

// Remove cells based on difficulty
function createPuzzle(solved: number[][], cellsToRemove: number, rng: () => number): number[][] {
  const puzzle = solved.map(row => [...row]);
  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  for (let i = 0; i < cellsToRemove && i < positions.length; i++) {
    puzzle[positions[i][0]][positions[i][1]] = 0;
  }
  return puzzle;
}

function getDifficultyConfig(level: number) {
  if (level <= 3) return { cellsToRemove: 30, label: 'Easy', color: 'text-green-500' };
  if (level <= 7) return { cellsToRemove: 40, label: 'Medium', color: 'text-yellow-500' };
  if (level <= 12) return { cellsToRemove: 48, label: 'Hard', color: 'text-orange-500' };
  return { cellsToRemove: 54, label: 'Expert', color: 'text-red-500' };
}

export const SudokuGame: React.FC<SudokuGameProps> = ({ userLevel = 1, onComplete }) => {
  const difficulty = getDifficultyConfig(userLevel);
  const daySeed = getDaySeed();

  const { solvedBoard, initialPuzzle } = useMemo(() => {
    const rng = seededRandom(daySeed + 1000); // offset for sudoku
    const solved = generateSolvedBoard(rng);
    const puzzle = createPuzzle(solved, difficulty.cellsToRemove, rng);
    return { solvedBoard: solved, initialPuzzle: puzzle };
  }, [daySeed, difficulty.cellsToRemove]);

  const [board, setBoard] = useState<number[][]>(initialPuzzle.map(r => [...r]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [hints, setHints] = useState(3);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Timer
  useEffect(() => {
    if (!isRunning || completed) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, completed]);

  const isInitialCell = useCallback((r: number, c: number) => initialPuzzle[r][c] !== 0, [initialPuzzle]);

  const handleCellClick = (r: number, c: number) => {
    if (completed) return;
    if (!isInitialCell(r, c)) {
      setSelected([r, c]);
    }
  };

  const handleNumberInput = (num: number) => {
    if (!selected || completed) return;
    const [r, c] = selected;
    if (isInitialCell(r, c)) return;

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = num;
    setBoard(newBoard);

    // Check if correct
    const newErrors = new Set(errors);
    const key = `${r}-${c}`;
    if (num !== solvedBoard[r][c] && num !== 0) {
      newErrors.add(key);
    } else {
      newErrors.delete(key);
    }
    setErrors(newErrors);

    // Check if completed
    if (num !== 0 && newErrors.size === 0) {
      const isFilled = newBoard.every(row => row.every(cell => cell !== 0));
      const isCorrect = newBoard.every((row, ri) => row.every((cell, ci) => cell === solvedBoard[ri][ci]));
      if (isFilled && isCorrect) {
        setCompleted(true);
        setIsRunning(false);
        onComplete(timer);
      }
    }
  };

  const handleClear = () => {
    if (!selected || completed) return;
    const [r, c] = selected;
    if (isInitialCell(r, c)) return;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = 0;
    setBoard(newBoard);
    const newErrors = new Set(errors);
    newErrors.delete(`${r}-${c}`);
    setErrors(newErrors);
  };

  const handleHint = () => {
    if (hints <= 0 || completed) return;
    // Find an empty or wrong cell
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== solvedBoard[r][c]) {
          const newBoard = board.map(row => [...row]);
          newBoard[r][c] = solvedBoard[r][c];
          setBoard(newBoard);
          const newErrors = new Set(errors);
          newErrors.delete(`${r}-${c}`);
          setErrors(newErrors);
          setHints(h => h - 1);
          setSelected([r, c]);
          return;
        }
      }
    }
  };

  const handleReset = () => {
    setBoard(initialPuzzle.map(r => [...r]));
    setErrors(new Set());
    setSelected(null);
    setCompleted(false);
    setTimer(0);
    setIsRunning(true);
    setHints(3);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={difficulty.color}>
            {difficulty.label}
          </Badge>
          <span className="text-sm text-muted-foreground">Level {userLevel}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTime(timer)}
          </div>
          <Button variant="ghost" size="sm" onClick={handleHint} disabled={hints <= 0 || completed}>
            <Lightbulb className="h-4 w-4 mr-1" />
            {hints}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex justify-center">
        <div className="grid grid-cols-9 border-2 border-foreground/40 rounded-lg overflow-hidden" style={{ width: 'min(100%, 360px)' }}>
          {board.map((row, ri) =>
            row.map((cell, ci) => {
              const isSelected = selected?.[0] === ri && selected?.[1] === ci;
              const isInitial = isInitialCell(ri, ci);
              const hasError = errors.has(`${ri}-${ci}`);
              const isSameNum = selected && cell !== 0 && board[selected[0]][selected[1]] === cell;
              const isSameRowCol = selected && (selected[0] === ri || selected[1] === ci);
              const isSameBox = selected && 
                Math.floor(selected[0] / 3) === Math.floor(ri / 3) && 
                Math.floor(selected[1] / 3) === Math.floor(ci / 3);

              return (
                <button
                  key={`${ri}-${ci}`}
                  onClick={() => handleCellClick(ri, ci)}
                  className={cn(
                    "aspect-square flex items-center justify-center text-sm sm:text-base font-medium transition-colors border border-border/30",
                    // Box borders
                    ci % 3 === 2 && ci !== 8 && "border-r-2 border-r-foreground/30",
                    ri % 3 === 2 && ri !== 8 && "border-b-2 border-b-foreground/30",
                    // States
                    isSelected && "bg-primary/20 ring-2 ring-primary",
                    !isSelected && (isSameRowCol || isSameBox) && "bg-primary/5",
                    !isSelected && isSameNum && "bg-primary/10",
                    hasError && "text-destructive bg-destructive/10",
                    isInitial ? "font-bold text-foreground" : "text-primary",
                    !isInitial && !completed && "cursor-pointer hover:bg-primary/10",
                  )}
                >
                  {cell !== 0 ? cell : ''}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Number Input */}
      {!completed && (
        <div className="flex justify-center gap-1 sm:gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <Button
              key={num}
              variant="outline"
              size="sm"
              className="w-8 h-8 sm:w-10 sm:h-10 p-0 text-sm sm:text-base font-medium"
              onClick={() => handleNumberInput(num)}
            >
              {num}
            </Button>
          ))}
          <Button variant="outline" size="sm" className="w-8 h-8 sm:w-10 sm:h-10 p-0 text-xs" onClick={handleClear}>
            ✕
          </Button>
        </div>
      )}

      {/* Completion */}
      {completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-2 p-4 bg-green-500/10 rounded-lg border border-green-500/30"
        >
          <Trophy className="h-8 w-8 text-yellow-500 mx-auto" />
          <h3 className="text-lg font-bold">Sudoku Complete! 🎉</h3>
          <p className="text-sm text-muted-foreground">Time: {formatTime(timer)}</p>
        </motion.div>
      )}
    </div>
  );
};
