import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestDifficulty } from "@/types/quest";

interface QuestGeneratorProps {
  onGenerate: (theme: string, difficulty: string) => Promise<any>;
  generating: boolean;
}

export function QuestGenerator({ onGenerate, generating }: QuestGeneratorProps) {
  const [theme, setTheme] = useState("");
  const [difficulty, setDifficulty] = useState<QuestDifficulty>("medium");

  const handleGenerate = async () => {
    await onGenerate(theme, difficulty);
    setTheme("");
  };

  return (
    <Card className="glow-gold border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary text-glow-gold">
          <Sparkles className="h-5 w-5" />
          Summon a Quest
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Enter a theme... (e.g. haunted forest, dragon's lair)"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="bg-muted border-border focus:border-primary"
        />
        <div className="flex gap-3">
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as QuestDifficulty)}>
            <SelectTrigger className="w-40 bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">🟢 Easy</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="hard">🟠 Hard</SelectItem>
              <SelectItem value="legendary">🟣 Legendary</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 font-display"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Conjuring...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Quest
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
