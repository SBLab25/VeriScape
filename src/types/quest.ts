export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "legendary";
  category: string;
  xp_reward: number;
  objectives: QuestObjective[];
  status: "active" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
}

export type QuestDifficulty = Quest["difficulty"];

export const DIFFICULTY_CONFIG: Record<QuestDifficulty, { label: string; color: string; xpRange: [number, number] }> = {
  easy: { label: "Easy", color: "text-success", xpRange: [50, 150] },
  medium: { label: "Medium", color: "text-primary", xpRange: [150, 350] },
  hard: { label: "Hard", color: "text-ember", xpRange: [350, 600] },
  legendary: { label: "Legendary", color: "text-mystic", xpRange: [600, 1000] },
};

export const QUEST_CATEGORIES = [
  "Combat", "Exploration", "Puzzle", "Stealth", "Diplomacy",
  "Crafting", "Survival", "Escort", "Gathering", "Investigation"
] as const;
