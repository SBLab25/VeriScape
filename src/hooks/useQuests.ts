// @ts-nocheck
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Quest, QuestObjective } from "@/types/quest";
import { useToast } from "@/hooks/use-toast";
import { useAdaptiveDifficulty } from "@/hooks/useAdaptiveDifficulty";

export function useQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const { recordQuestCompletion, getScaledXpReward, recommendation } = useAdaptiveDifficulty();

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("Quests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load quests", description: error.message, variant: "destructive" });
    } else {
      setQuests(
        (data || []).map((q: any) => ({
          ...q,
          objectives: (q.objectives as any[] || []).map((o: any, i: number) => ({
            id: o.id || String(i),
            description: o.description,
            completed: o.completed || false,
          })),
        }))
      );
    }
    setLoading(false);
  }, [toast]);

  const generateQuest = useCallback(
    async (theme: string, difficulty: string) => {
      setGenerating(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-quest", {
          body: { theme, difficulty },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const objectives: QuestObjective[] = data.objectives.map((o: any, i: number) => ({
          id: String(i),
          description: o.description,
          completed: false,
        }));

        const insertRow = {
          title: data.title,
          description: data.description,
          difficulty,
          category: data.category,
          xp_reward: data.xp_reward,
          objectives: objectives as any,
          status: "active",
        };

        const { data: inserted, error: insertError } = await supabase
          .from("Quests")
          .insert(insertRow)
          .select()
          .single();

        if (insertError) throw insertError;

        const quest = {
          ...inserted,
          difficulty: inserted.difficulty as Quest["difficulty"],
          status: inserted.status as Quest["status"],
          objectives: (inserted.objectives as any[]).map((o: any, i: number) => ({
            id: o.id || String(i),
            description: o.description,
            completed: o.completed || false,
          })),
        } as Quest;

        setQuests((prev) => [quest, ...prev]);
        toast({ title: "Quest Generated!", description: `"${quest.title}" has been added to your quest board.` });
        return quest;
      } catch (e: any) {
        toast({ title: "Quest generation failed", description: e.message, variant: "destructive" });
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [toast]
  );

  const verifyObjective = useCallback(
    async (questId: string, objectiveId: string, proof: string) => {
      const quest = quests.find((q) => q.id === questId);
      if (!quest) return null;

      const objective = quest.objectives.find((o) => o.id === objectiveId);
      if (!objective) return null;

      try {
        const { data, error } = await supabase.functions.invoke("verify-quest", {
          body: { objective: objective.description, proof },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        if (data.verified) {
          const updatedObjectives = quest.objectives.map((o) =>
            o.id === objectiveId ? { ...o, completed: true } : o
          );
          const allComplete = updatedObjectives.every((o) => o.completed);

          // Scale XP based on adaptive difficulty
          const scaledXp = allComplete
            ? getScaledXpReward(quest.xp_reward, quest.difficulty)
            : quest.xp_reward;

          await supabase
            .from("Quests")
            .update({
              objectives: updatedObjectives as any,
              status: allComplete ? "completed" : "active",
              completed_at: allComplete ? new Date().toISOString() : null,
            })
            .eq("id", questId);

          // Record completion for adaptive difficulty tracking
          if (allComplete) {
            await recordQuestCompletion(quest.difficulty, scaledXp, quest.category);
          }

          setQuests((prev) =>
            prev.map((q) =>
              q.id === questId
                ? { ...q, objectives: updatedObjectives, status: allComplete ? "completed" : "active", completed_at: allComplete ? new Date().toISOString() : null }
                : q
            )
          );
        }

        return data;
      } catch (e: any) {
        toast({ title: "Verification failed", description: e.message, variant: "destructive" });
        return null;
      }
    },
    [quests, toast]
  );

  const deleteQuest = useCallback(
    async (questId: string) => {
      const { error } = await supabase.from("Quests").delete().eq("id", questId);
      if (error) {
        toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      } else {
        setQuests((prev) => prev.filter((q) => q.id !== questId));
      }
    },
    [toast]
  );

  return { quests, loading, generating, fetchQuests, generateQuest, verifyObjective, deleteQuest, recommendedDifficulty: recommendation.recommended };
}
