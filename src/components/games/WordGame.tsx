// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trophy, RotateCcw, Lightbulb, Clock, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WordGameProps {
  userLevel?: number;
  onComplete: (timeSeconds: number) => void;
}

// Word pools by difficulty with clues
interface WordEntry { word: string; clue: string; }
const WORD_POOLS: Record<string, WordEntry[]> = {
  easy: [
    { word: 'APPLE', clue: 'A popular red or green fruit' },
    { word: 'BRAVE', clue: 'Showing courage in the face of danger' },
    { word: 'CLOUD', clue: 'White fluffy thing floating in the sky' },
    { word: 'DREAM', clue: 'What you experience while sleeping' },
    { word: 'EARTH', clue: 'The planet we live on' },
    { word: 'FLAME', clue: 'The glowing part of a fire' },
    { word: 'GRAPE', clue: 'Small fruit used to make wine' },
    { word: 'HEART', clue: 'The organ that pumps blood' },
    { word: 'IMAGE', clue: 'A picture or visual representation' },
    { word: 'JUICE', clue: 'A drink squeezed from fruits' },
    { word: 'KNIFE', clue: 'A sharp tool used for cutting' },
    { word: 'LEMON', clue: 'A sour yellow citrus fruit' },
    { word: 'MUSIC', clue: 'An art form made of sounds and rhythm' },
    { word: 'NIGHT', clue: 'The dark period between sunset and sunrise' },
    { word: 'OCEAN', clue: 'A vast body of saltwater' },
    { word: 'PIANO', clue: 'A musical instrument with black and white keys' },
    { word: 'QUEEN', clue: 'A female ruler of a kingdom' },
    { word: 'RIVER', clue: 'A flowing body of freshwater' },
    { word: 'STONE', clue: 'A small piece of rock' },
    { word: 'TIGER', clue: 'A large striped wild cat' },
    { word: 'VOICE', clue: 'The sound produced when you speak' },
    { word: 'WATER', clue: 'A clear liquid essential for life' },
    { word: 'BEACH', clue: 'Sandy shore beside the sea' },
    { word: 'CHAIR', clue: 'A piece of furniture you sit on' },
    { word: 'DANCE', clue: 'Moving your body to music' },
    { word: 'EAGLE', clue: 'A large bird of prey known for sharp vision' },
    { word: 'FROST', clue: 'Thin ice crystals forming on cold surfaces' },
    { word: 'HOUSE', clue: 'A building where people live' },
    { word: 'LIGHT', clue: 'What lets you see in the dark' },
    { word: 'PEACH', clue: 'A soft fuzzy fruit with a pit inside' },
  ],
  medium: [
    { word: 'BRIDGE', clue: 'A structure built to cross over water or a gap' },
    { word: 'CASTLE', clue: 'A large fortified building from medieval times' },
    { word: 'DESERT', clue: 'A dry, sandy landscape with very little rain' },
    { word: 'ENERGY', clue: 'The power needed to do work or move things' },
    { word: 'FOREST', clue: 'A large area covered with trees' },
    { word: 'GARDEN', clue: 'A place where flowers and plants are grown' },
    { word: 'HARBOR', clue: 'A sheltered area of water where ships dock' },
    { word: 'ISLAND', clue: 'A piece of land surrounded by water' },
    { word: 'JUNGLE', clue: 'A dense tropical forest full of wildlife' },
    { word: 'KNIGHT', clue: 'A medieval warrior who served a king' },
    { word: 'LEGEND', clue: 'A famous story passed down through generations' },
    { word: 'MIRROR', clue: 'A reflective surface that shows your image' },
    { word: 'NATURE', clue: 'The natural world of plants, animals, and landscapes' },
    { word: 'ORACLE', clue: 'A source of wise counsel or prophecy' },
    { word: 'PALACE', clue: 'A grand residence of a royal family' },
    { word: 'ROCKET', clue: 'A vehicle that launches into space' },
    { word: 'SILVER', clue: 'A shiny precious metal, second to gold' },
    { word: 'TEMPLE', clue: 'A sacred building for worship' },
    { word: 'VALLEY', clue: 'A low area of land between hills or mountains' },
    { word: 'WINTER', clue: 'The coldest season of the year' },
    { word: 'CANYON', clue: 'A deep, narrow valley with steep sides' },
    { word: 'DRAGON', clue: 'A mythical fire-breathing creature' },
    { word: 'FALCON', clue: 'A fast bird of prey used in hunting' },
    { word: 'PLANET', clue: 'A large celestial body orbiting a star' },
    { word: 'VOYAGE', clue: 'A long journey, especially by sea' },
    { word: 'WISDOM', clue: 'Deep knowledge gained through experience' },
  ],
  hard: [
    { word: 'ALCHEMY', clue: 'An ancient practice of turning metals into gold' },
    { word: 'CASCADE', clue: 'A waterfall or a series of things falling' },
    { word: 'ECLIPSE', clue: 'When one celestial body blocks another' },
    { word: 'FANTASY', clue: 'A genre involving magic and imaginary worlds' },
    { word: 'GLACIER', clue: 'A massive slow-moving body of ice' },
    { word: 'HORIZON', clue: 'The line where the earth meets the sky' },
    { word: 'JAVELIN', clue: 'A spear thrown in athletic competitions' },
    { word: 'LANTERN', clue: 'A portable lamp with a protective case' },
    { word: 'MYSTERY', clue: 'Something difficult to understand or explain' },
    { word: 'PHOENIX', clue: 'A mythical bird reborn from its own ashes' },
    { word: 'SHELTER', clue: 'A place giving protection from weather or danger' },
    { word: 'THUNDER', clue: 'The loud sound that follows lightning' },
    { word: 'UNICORN', clue: 'A mythical horse with a single horn' },
    { word: 'WARRIOR', clue: 'A brave fighter or soldier' },
    { word: 'ANCIENT', clue: 'Belonging to a very distant past' },
    { word: 'BALANCE', clue: 'A state of equal weight or stability' },
    { word: 'CLIMATE', clue: 'Long-term weather patterns of a region' },
    { word: 'ELEMENT', clue: 'A basic substance like oxygen or gold' },
    { word: 'FREEDOM', clue: 'The state of being free and unrestricted' },
    { word: 'GRAVITY', clue: 'The force that pulls objects toward Earth' },
    { word: 'HARMONY', clue: 'A pleasing combination of musical notes or ideas' },
    { word: 'JOURNEY', clue: 'Traveling from one place to another' },
    { word: 'KINGDOM', clue: 'A territory ruled by a king or queen' },
    { word: 'TRIUMPH', clue: 'A great victory or achievement' },
  ],
  expert: [
    { word: 'ABSOLUTE', clue: 'Complete and total, without any exception' },
    { word: 'CATALYZE', clue: 'To speed up a chemical reaction or process' },
    { word: 'DISGUISE', clue: 'Altering appearance to hide true identity' },
    { word: 'ELOQUENT', clue: 'Fluent and persuasive in speaking or writing' },
    { word: 'FORTRESS', clue: 'A heavily fortified military stronghold' },
    { word: 'GUARDIAN', clue: 'A person who protects or watches over someone' },
    { word: 'HERITAGE', clue: 'Traditions and values passed down through history' },
    { word: 'ILLUSION', clue: 'Something that deceives the eye or mind' },
    { word: 'JUBILANT', clue: 'Feeling or expressing great joy and triumph' },
    { word: 'KEYSTONE', clue: 'The central stone holding an arch together' },
    { word: 'MARATHON', clue: 'A long-distance running race of 26.2 miles' },
    { word: 'ORNAMENT', clue: 'A decorative object used to beautify' },
    { word: 'PARADIGM', clue: 'A typical example or model of something' },
    { word: 'SPECTRUM', clue: 'A range of colors or a band of frequencies' },
    { word: 'TREASURE', clue: 'Valuable items like gold, jewels, or riches' },
    { word: 'UMBRELLA', clue: 'A folding device used for rain protection' },
    { word: 'VANGUARD', clue: 'The leading position in a movement or trend' },
    { word: 'WONDROUS', clue: 'Inspiring a feeling of wonder or amazement' },
    { word: 'CHAMPION', clue: 'A winner of a competition or contest' },
    { word: 'EXPLORER', clue: 'A person who travels to discover new places' },
  ]
};

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

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getDifficultyKey(level: number): string {
  if (level <= 3) return 'easy';
  if (level <= 7) return 'medium';
  if (level <= 12) return 'hard';
  return 'expert';
}

function getDifficultyLabel(key: string) {
  const map: Record<string, { label: string; color: string }> = {
    easy: { label: 'Easy', color: 'text-green-500' },
    medium: { label: 'Medium', color: 'text-yellow-500' },
    hard: { label: 'Hard', color: 'text-orange-500' },
    expert: { label: 'Expert', color: 'text-red-500' },
  };
  return map[key] || map.easy;
}

const MAX_ATTEMPTS = 6;

export const WordGame: React.FC<WordGameProps> = ({ userLevel = 1, onComplete }) => {
  const diffKey = getDifficultyKey(userLevel);
  const diffInfo = getDifficultyLabel(diffKey);
  const daySeed = getDaySeed();

  const targetEntry = useMemo(() => {
    const rng = seededRandom(daySeed + 2000);
    const pool = WORD_POOLS[diffKey];
    const idx = Math.floor(rng() * pool.length);
    return pool[idx];
  }, [daySeed, diffKey]);

  const targetWord = targetEntry.word;
  const clue = targetEntry.clue;

  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [completed, setCompleted] = useState(false);
  const [won, setWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [hints, setHints] = useState(2);
  const [shake, setShake] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);

  useEffect(() => {
    if (!isRunning || completed) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, completed]);

  const getLetterStatus = useCallback((guess: string, index: number): 'correct' | 'present' | 'absent' => {
    if (guess[index] === targetWord[index]) return 'correct';
    if (targetWord.includes(guess[index])) return 'present';
    return 'absent';
  }, [targetWord]);

  const handleSubmit = () => {
    if (currentGuess.length !== targetWord.length) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const upper = currentGuess.toUpperCase();
    const newGuesses = [...guesses, upper];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (upper === targetWord) {
      setCompleted(true);
      setWon(true);
      setIsRunning(false);
      onComplete(timer);
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setCompleted(true);
      setWon(false);
      setIsRunning(false);
    }
  };

  const handleHint = () => {
    if (hints <= 0 || completed) return;
    // Reveal a random unguessed letter position
    const unrevealed = Array.from({ length: targetWord.length }, (_, i) => i)
      .filter(i => !revealedHints.includes(i));
    if (unrevealed.length === 0) return;
    const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    setRevealedHints(prev => [...prev, idx]);
    setHints(h => h - 1);
  };

  const handleReset = () => {
    setGuesses([]);
    setCurrentGuess('');
    setCompleted(false);
    setWon(false);
    setTimer(0);
    setIsRunning(true);
    setHints(2);
    setRevealedHints([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard status tracking
  const keyboardStatus = useMemo(() => {
    const status: Record<string, 'correct' | 'present' | 'absent'> = {};
    guesses.forEach(guess => {
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        const s = getLetterStatus(guess, i);
        if (s === 'correct') status[letter] = 'correct';
        else if (s === 'present' && status[letter] !== 'correct') status[letter] = 'present';
        else if (!status[letter]) status[letter] = 'absent';
      }
    });
    return status;
  }, [guesses, getLetterStatus]);

  const statusColors = {
    correct: 'bg-green-500 text-white border-green-600',
    present: 'bg-yellow-500 text-white border-yellow-600',
    absent: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={diffInfo.color}>
            {diffInfo.label}
          </Badge>
          <span className="text-sm text-muted-foreground">{targetWord.length} letters</span>
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

      {/* Clue */}
      <div className="text-center px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">💡 Clue</p>
        <p className="text-sm font-medium text-foreground">{clue}</p>
      </div>

      {revealedHints.length > 0 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: targetWord.length }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-8 h-8 flex items-center justify-center border rounded text-sm font-bold",
                revealedHints.includes(i) ? "border-primary bg-primary/10 text-primary" : "border-border"
              )}
            >
              {revealedHints.includes(i) ? targetWord[i] : '_'}
            </div>
          ))}
        </div>
      )}

      {/* Previous guesses */}
      <div className="space-y-2">
        {guesses.map((guess, gi) => (
          <motion.div
            key={gi}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-1"
          >
            {guess.split('').map((letter, li) => {
              const status = getLetterStatus(guess, li);
              return (
                <motion.div
                  key={li}
                  initial={{ rotateX: 90 }}
                  animate={{ rotateX: 0 }}
                  transition={{ delay: li * 0.1 }}
                  className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border-2 rounded font-bold text-sm sm:text-base",
                    statusColors[status]
                  )}
                >
                  {letter}
                </motion.div>
              );
            })}
          </motion.div>
        ))}

        {/* Empty rows */}
        {!completed && Array.from({ length: MAX_ATTEMPTS - guesses.length - 1 }).map((_, i) => (
          <div key={`empty-${i}`} className="flex justify-center gap-1">
            {Array.from({ length: targetWord.length }).map((_, j) => (
              <div key={j} className="w-10 h-10 sm:w-12 sm:h-12 border border-border/30 rounded" />
            ))}
          </div>
        ))}
      </div>

      {/* Input */}
      {!completed && (
        <motion.div
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center gap-2"
        >
          <Input
            value={currentGuess}
            onChange={e => setCurrentGuess(e.target.value.toUpperCase().slice(0, targetWord.length))}
            onKeyDown={handleKeyDown}
            placeholder={`Enter ${targetWord.length}-letter word`}
            className="max-w-[200px] text-center font-mono uppercase tracking-widest"
            maxLength={targetWord.length}
            autoFocus
          />
          <Button onClick={handleSubmit} disabled={currentGuess.length !== targetWord.length}>
            <Check className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Keyboard */}
      {!completed && (
        <div className="space-y-1">
          {['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row, ri) => (
            <div key={ri} className="flex justify-center gap-0.5">
              {row.split('').map(letter => (
                <button
                  key={letter}
                  onClick={() => {
                    if (currentGuess.length < targetWord.length) {
                      setCurrentGuess(prev => prev + letter);
                    }
                  }}
                  className={cn(
                    "w-7 h-9 sm:w-8 sm:h-10 rounded text-xs sm:text-sm font-medium transition-colors",
                    keyboardStatus[letter]
                      ? statusColors[keyboardStatus[letter]]
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Result */}
      {completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "text-center space-y-2 p-4 rounded-lg border",
            won ? "bg-green-500/10 border-green-500/30" : "bg-destructive/10 border-destructive/30"
          )}
        >
          {won ? (
            <>
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto" />
              <h3 className="text-lg font-bold">Word Found! 🎉</h3>
              <p className="text-sm text-muted-foreground">
                Solved in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'} • {formatTime(timer)}
              </p>
            </>
          ) : (
            <>
              <X className="h-8 w-8 text-destructive mx-auto" />
              <h3 className="text-lg font-bold">Game Over</h3>
              <p className="text-sm text-muted-foreground">The word was: <strong>{targetWord}</strong></p>
              <Button size="sm" onClick={handleReset} className="mt-2">
                <RotateCcw className="h-4 w-4 mr-1" /> Try Again
              </Button>
            </>
          )}
        </motion.div>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Attempts: {guesses.length}/{MAX_ATTEMPTS}
      </p>
    </div>
  );
};
