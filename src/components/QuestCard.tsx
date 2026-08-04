import { useState } from "react";
import { CheckCircle2, Circle, Shield, Trash2, Send, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Quest, DIFFICULTY_CONFIG } from "@/types/quest";
import { cn } from "@/lib/utils";

interface QuestCardProps {
  quest: Quest;
  onVerify: (questId: string, objectiveId: string, proof: string) => Promise<any>;
  onDelete: (questId: string) => void;
}

export function QuestCard({ quest, onVerify, onDelete }: QuestCardProps) {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [proofInputs, setProofInputs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, { verified: boolean; feedback: string }>>({});

  const diffConfig = DIFFICULTY_CONFIG[quest.difficulty];
  const completedCount = quest.objectives.filter((o) => o.completed).length;
  const progress = (completedCount / quest.objectives.length) * 100;

  const handleVerify = async (objectiveId: string) => {
    const proof = proofInputs[objectiveId];
    if (!proof?.trim()) return;

    setVerifyingId(objectiveId);
    const result = await onVerify(quest.id, objectiveId, proof);
    if (result) {
      setFeedback((prev) => ({ ...prev, [objectiveId]: result }));
      if (result.verified) {
        setProofInputs((prev) => ({ ...prev, [objectiveId]: "" }));
      }
    }
    setVerifyingId(null);
  };

  return (
    <Card
      className={cn(
        "transition-all duration-300 border-border/50 hover:border-primary/30",
        quest.status === "completed" && "glow-mystic border-mystic/30"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("font-display text-xs", diffConfig.color)}>
                {diffConfig.label}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {quest.category}
              </Badge>
              {quest.status === "completed" && (
                <Badge className="bg-mystic text-accent-foreground text-xs">
                  ✨ Complete
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-tight">{quest.title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => onDelete(quest.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{quest.description}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3 text-primary" />
          <span className="text-primary font-semibold">{quest.xp_reward} XP</span>
          <span className="mx-1">•</span>
          <span>{completedCount}/{quest.objectives.length} objectives</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quest.objectives.map((obj) => (
          <div key={obj.id} className="space-y-2">
            <div className="flex items-start gap-2">
              {obj.completed ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <span
                className={cn(
                  "text-sm",
                  obj.completed && "line-through text-muted-foreground"
                )}
              >
                {obj.description}
              </span>
            </div>

            {/* Feedback display */}
            {feedback[obj.id] && (
              <div
                className={cn(
                  "ml-7 text-xs px-3 py-2 rounded-md border",
                  feedback[obj.id].verified
                    ? "bg-success/10 border-success/30 text-success"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                )}
              >
                {feedback[obj.id].verified ? (
                  <CheckCircle2 className="h-3 w-3 inline mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 inline mr-1" />
                )}
                {feedback[obj.id].feedback}
              </div>
            )}

            {/* Proof input */}
            {!obj.completed && quest.status !== "completed" && (
              <div className="ml-7 flex gap-2">
                <Input
                  placeholder="Describe how you completed this..."
                  value={proofInputs[obj.id] || ""}
                  onChange={(e) =>
                    setProofInputs((prev) => ({ ...prev, [obj.id]: e.target.value }))
                  }
                  className="text-xs h-8 bg-muted border-border"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify(obj.id)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 px-2"
                  disabled={verifyingId === obj.id || !proofInputs[obj.id]?.trim()}
                  onClick={() => handleVerify(obj.id)}
                >
                  {verifyingId === obj.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
