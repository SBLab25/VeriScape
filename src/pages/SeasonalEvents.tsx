// @ts-nocheck
import React, { useState } from 'react';
import { TopNavbar } from '@/components/navigation/TopNavbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Snowflake, Sun, Leaf, TreeDeciduous, Star, CheckCircle2, Trophy, Zap } from 'lucide-react';
import { useSeasonalEvents } from '@/hooks/useSeasonalEvents';
import { motion, AnimatePresence } from 'framer-motion';
import { LottieLoading } from '@/components/ui/LottieLoading';

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-5 w-5" />,
  summer: <Sun className="h-5 w-5" />,
  spring: <Leaf className="h-5 w-5" />,
  autumn: <TreeDeciduous className="h-5 w-5" />,
  custom: <Star className="h-5 w-5" />,
};

const seasonGradients: Record<string, string> = {
  winter: 'from-blue-500/20 via-cyan-500/10 to-background',
  summer: 'from-orange-500/20 via-yellow-500/10 to-background',
  spring: 'from-green-500/20 via-emerald-500/10 to-background',
  autumn: 'from-amber-500/20 via-red-500/10 to-background',
  custom: 'from-primary/20 via-secondary/10 to-background',
};

const SeasonalEvents = () => {
  const { events, loading, joinEvent, completeEventQuest, isJoined, isQuestCompleted, getTimeRemaining } = useSeasonalEvents();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavbar />
        <div className="flex justify-center py-20">
          <LottieLoading size="lg" message="Loading seasonal events..." />
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
            🎄 Seasonal Events
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Limited-time holiday quests with bonus XP and exclusive rewards!
          </p>
        </div>

        {events.length === 0 ? (
          <Card className="max-w-lg mx-auto text-center py-12">
            <CardContent>
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Active Events</h3>
              <p className="text-muted-foreground">Check back soon for exciting seasonal events!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {events.map((event, idx) => {
              const time = getTimeRemaining(event.end_date);
              const joined = isJoined(event.id);
              const completedQuests = (event.quests || []).filter(q => isQuestCompleted(q.id)).length;
              const totalQuests = (event.quests || []).length;
              const progressPct = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`overflow-hidden bg-gradient-to-r ${seasonGradients[event.season] || seasonGradients.custom} border-primary/20`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-xl">
                            {seasonIcons[event.season] || seasonIcons.custom}
                          </div>
                          <div>
                            <CardTitle className="text-2xl">{event.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {event.theme}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {time.expired ? 'Ended' : `${time.days}d ${time.hours}h left`}
                              </Badge>
                              {event.xp_multiplier > 1 && (
                                <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30 text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  {event.xp_multiplier}x XP
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {!joined ? (
                          <Button onClick={() => joinEvent(event.id)} size="sm">Join Event</Button>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Joined
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{event.description}</p>

                      {joined && totalQuests > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{completedQuests}/{totalQuests} quests</span>
                          </div>
                          <Progress value={progressPct} className="h-2" />
                        </div>
                      )}

                      {event.reward_type && (
                        <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-lg">
                          <Trophy className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Event Reward: {event.reward_value} {event.reward_type}</span>
                        </div>
                      )}

                      {/* Event Quests */}
                      {(event.quests || []).length > 0 && (
                        <div className="space-y-3 mt-4">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Event Quests</h4>
                          {event.quests!.map((quest) => {
                            const completed = isQuestCompleted(quest.id);
                            return (
                              <Card key={quest.id} className={`${completed ? 'opacity-70 border-green-500/30' : ''}`}>
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {completed && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                      <span className="font-medium">{quest.title}</span>
                                      <Badge variant="outline" className="text-xs">{quest.difficulty}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{quest.description}</p>
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="text-sm font-bold text-primary">{quest.xp_reward} XP</p>
                                    {joined && !completed && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="mt-1"
                                        onClick={() => completeEventQuest(event.id, quest.id, quest.xp_reward)}
                                      >
                                        Complete
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
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

export default SeasonalEvents;
