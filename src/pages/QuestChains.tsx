// @ts-nocheck
import React, { useState } from 'react';
import { TopNavbar } from '@/components/navigation/TopNavbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Link2, ChevronRight, Lock, CheckCircle2, Play, BookOpen, Star, Trophy } from 'lucide-react';
import { useQuestChains } from '@/hooks/useQuestChains';
import { motion } from 'framer-motion';
import { LottieLoading } from '@/components/ui/LottieLoading';

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30',
  medium: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  hard: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
  legendary: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
};

const QuestChains = () => {
  const { chains, loading, startChain, completeStep, getChainProgress, isStepCompleted } = useQuestChains();
  const [expandedChain, setExpandedChain] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavbar />
        <div className="flex justify-center py-20">
          <LottieLoading size="lg" message="Loading quest chains..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <TopNavbar />
      <main className="container mx-auto px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent mb-3">
            ⛓️ Quest Chains
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Epic multi-step storylines — follow the narrative and unlock rewards!
          </p>
        </div>

        {chains.length === 0 ? (
          <Card className="max-w-lg mx-auto text-center py-12">
            <CardContent>
              <Link2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Quest Chains Yet</h3>
              <p className="text-muted-foreground">Quest chains will appear here soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {chains.map((chain, idx) => {
              const progress = getChainProgress(chain.id);
              const isStarted = !!progress;
              const isComplete = progress?.status === 'completed';
              const stepsCompletedCount = progress?.steps_completed?.length || 0;
              const progressPct = chain.total_steps > 0 ? (stepsCompletedCount / chain.total_steps) * 100 : 0;
              const isExpanded = expandedChain === chain.id;

              return (
                <motion.div
                  key={chain.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`overflow-hidden ${isComplete ? 'border-green-500/30 bg-green-500/5' : 'border-primary/10'}`}>
                    <CardHeader 
                      className="cursor-pointer hover:bg-accent/5 transition-colors"
                      onClick={() => setExpandedChain(isExpanded ? null : chain.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isComplete && <Trophy className="h-5 w-5 text-yellow-500" />}
                            <CardTitle className="text-xl">{chain.title}</CardTitle>
                          </div>
                          <p className="text-muted-foreground text-sm">{chain.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={difficultyColors[chain.difficulty] || ''}>
                              {chain.difficulty}
                            </Badge>
                            <Badge variant="secondary">{chain.total_steps} steps</Badge>
                            <Badge variant="secondary">{chain.category}</Badge>
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              <Star className="h-3 w-3 mr-1" />{chain.total_xp_reward} XP
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isStarted ? (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); startChain(chain.id); }}>
                              <Play className="h-4 w-4 mr-1" /> Start
                            </Button>
                          ) : isComplete ? (
                            <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                            </Badge>
                          ) : (
                            <Badge variant="outline">Step {progress?.current_step}/{chain.total_steps}</Badge>
                          )}
                          <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      {isStarted && !isComplete && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span>{stepsCompletedCount}/{chain.total_steps}</span>
                          </div>
                          <Progress value={progressPct} className="h-1.5" />
                        </div>
                      )}
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        {chain.storyline && (
                          <div className="p-4 bg-accent/10 rounded-lg mb-4 border-l-4 border-primary/30">
                            <div className="flex items-center gap-2 mb-1">
                              <BookOpen className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">Storyline</span>
                            </div>
                            <p className="text-sm text-muted-foreground italic">{chain.storyline}</p>
                          </div>
                        )}

                        <div className="space-y-3">
                          {(chain.steps || []).map((step, stepIdx) => {
                            const stepDone = isStepCompleted(chain.id, step.step_number);
                            const isCurrentStep = progress?.current_step === step.step_number && !isComplete;
                            const isLocked = isStarted && !stepDone && !isCurrentStep;

                            return (
                              <div key={step.id} className="flex gap-3">
                                {/* Step connector line */}
                                <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    stepDone ? 'bg-green-500 text-white' : 
                                    isCurrentStep ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : 
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {stepDone ? <CheckCircle2 className="h-4 w-4" /> : step.step_number}
                                  </div>
                                  {stepIdx < (chain.steps?.length || 0) - 1 && (
                                    <div className={`w-0.5 flex-1 min-h-[20px] ${stepDone ? 'bg-green-500' : 'bg-muted'}`} />
                                  )}
                                </div>

                                <Card className={`flex-1 ${isCurrentStep ? 'border-primary/30 bg-primary/5' : ''} ${isLocked ? 'opacity-50' : ''}`}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                          <span className="font-medium">{step.title}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                                        {step.narrative && isCurrentStep && (
                                          <p className="text-sm italic text-primary/80 mt-2 p-2 bg-primary/5 rounded">
                                            "{step.narrative}"
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right ml-3">
                                        <span className="text-xs text-primary font-bold">+{step.xp_reward} XP</span>
                                        {isCurrentStep && !stepDone && (
                                          <Button 
                                            size="sm" 
                                            variant="default" 
                                            className="mt-2 block"
                                            onClick={() => completeStep(chain.id, step.step_number)}
                                          >
                                            Complete
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default QuestChains;
