// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Users, PlusCircle, LogIn, X, Crown, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSocialGroups, type SocialGroup } from "@/hooks/useSocialGroups";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CrewSidebarProps {
  onSearchChange?: (text: string) => void;
}

export default function CrewSidebar({ onSearchChange }: CrewSidebarProps) {
  const { user } = useAuth();
  const { groups, myGroups, loading, createGroup, joinGroup, leaveGroup, isMember, categories, refresh } = useSocialGroups();
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem("crewSidebar") === "open");
  const [query, setQuery] = useState("");
  const [crewOpen, setCrewOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(true);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newEmoji, setNewEmoji] = useState("🏕️");
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    localStorage.setItem("crewSidebar", isOpen ? "open" : "closed");
  }, [isOpen]);

  useEffect(() => {
    if (user) loadTeams();
  }, [user]);

  const loadTeams = async () => {
    if (!user) return;
    try {
      const { data: memberCounts } = await (supabase as any)
        .from('team_members')
        .select('team_id');
      const teamMemberCounts = (memberCounts || []).reduce((acc: any, member: any) => {
        acc[member.team_id] = (acc[member.team_id] || 0) + 1;
        return acc;
      }, {});
      const { data: memberships } = await (supabase as any)
        .from('team_members')
        .select(`team_id, role, teams(*)`)
        .eq('user_id', user.id);
      setMyTeams((memberships || []).map((m: any) => ({
        ...m.teams,
        member_count: teamMemberCounts[m.team_id] || 0,
        user_role: m.role
      })));
    } catch (err) {
      console.error('Error loading teams', err);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any)
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Left team' });
      await loadTeams();
    } catch (err) {
      toast({ title: 'Error', description: 'Could not leave team', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newDesc.trim()) return;
    setCreating(true);
    const result = await createGroup(newName, newDesc, newCategory, newEmoji);
    if (result) {
      setShowCreateForm(false);
      setNewName(""); setNewDesc(""); setNewCategory("General"); setNewEmoji("🏕️");
    }
    setCreating(false);
  };

  const availableGroups = useMemo(() => {
    return groups.filter(g => !isMember(g.id));
  }, [groups, myGroups]);

  const filteredMyGroups = useMemo(() => {
    const q = query.toLowerCase();
    return myGroups.filter(g => {
      const matchSearch = !q || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
      const matchCat = filterCategory === "all" || g.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [myGroups, query, filterCategory]);

  const filteredAvailable = useMemo(() => {
    const q = query.toLowerCase();
    return availableGroups.filter(g => {
      const matchSearch = !q || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
      const matchCat = filterCategory === "all" || g.category === filterCategory;
      return matchSearch && matchCat;
    }).slice(0, 10);
  }, [availableGroups, query, filterCategory]);

  return (
    <div className="fixed left-8 top-0 z-40 h-screen flex items-start">
      <div className="relative h-full">
        <div className="h-full w-px bg-border/60" />
        <Button
          aria-label={isOpen ? "Collapse crew sidebar" : "Expand crew sidebar"}
          variant="secondary"
          size="icon"
          onClick={() => setIsOpen((v) => !v)}
          className="absolute -right-4 top-24 h-8 w-8 rounded-full border border-border/60 bg-background/95 shadow-md backdrop-blur hover:scale-105 transition"
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      <div
        className={
          "ml-2 h-[90vh] mt-4 rounded-xl border border-border/60 bg-card/95 backdrop-blur shadow-lg overflow-hidden w-80 transition-transform duration-300 will-change-transform " +
          (isOpen ? "translate-x-0 opacity-100" : "-translate-x-[calc(100%+0.5rem)] opacity-0")
        }
      >
        <div className={"h-full flex flex-col " + (isOpen ? "p-3" : "p-0")}>
          {/* Search & Filter */}
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clubs..." className="pl-8" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Clubs Section */}
          <Card className="p-3 flex-1 overflow-auto">
            <button
              type="button"
              onClick={() => setCrewOpen((v) => !v)}
              className="w-full flex items-center justify-between"
              aria-expanded={crewOpen}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="font-medium">Clubs</span>
                <Badge variant="secondary" className="text-xs">{myGroups.length}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{crewOpen ? "Hide" : "Show"}</span>
            </button>

            {crewOpen && (
              <div className="mt-3 space-y-3">
                {/* Create */}
                <div>
                  {!showCreateForm ? (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setShowCreateForm(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" /> Create Club
                    </Button>
                  ) : (
                    <div className="space-y-2 p-2 rounded-lg bg-muted/50">
                      <div className="flex gap-2">
                        <Input placeholder="🏕️" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} className="w-12 text-center text-lg p-1" maxLength={2} />
                        <Input placeholder="Club name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
                      </div>
                      <Input placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                      <Select value={newCategory} onValueChange={setNewCategory}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={handleCreate} disabled={creating || !newName.trim() || !newDesc.trim()}>
                          {creating ? 'Creating...' : 'Create'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* My Clubs */}
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">My Clubs</div>
                  <div className="space-y-1 max-h-48 overflow-auto pr-1">
                    {loading ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : filteredMyGroups.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No clubs yet</div>
                    ) : (
                      filteredMyGroups.map((g) => (
                        <div key={g.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted group">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-lg">{g.icon_emoji}</span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{g.name}</div>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{g.category}</Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Users className="h-2.5 w-2.5" />{g.member_count}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 shrink-0" onClick={() => leaveGroup(g.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Discover */}
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Discover</div>
                  <div className="space-y-1 max-h-48 overflow-auto pr-1">
                    {loading ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : filteredAvailable.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No clubs to discover</div>
                    ) : (
                      filteredAvailable.map((g) => (
                        <div key={g.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-lg">{g.icon_emoji}</span>
                            <div className="min-w-0">
                              <div className="truncate text-sm">{g.name}</div>
                              <span className="text-[10px] text-muted-foreground">{g.category} · {g.member_count} members</span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => joinGroup(g.id)}>
                            <LogIn className="h-3 w-3 mr-1" /> Join
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Team Section */}
          <Card className="p-3 mt-3 overflow-auto">
            <button
              type="button"
              onClick={() => setTeamOpen((v) => !v)}
              className="w-full flex items-center justify-between"
              aria-expanded={teamOpen}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="font-medium">Teams</span>
              </div>
              <span className="text-xs text-muted-foreground">{teamOpen ? "Hide" : "Show"}</span>
            </button>

            {teamOpen && (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">My teams</div>
                  <div className="space-y-1 max-h-64 overflow-auto pr-1">
                    {myTeams.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No teams yet</div>
                    ) : (
                      myTeams.map((t: any) => (
                        <div key={t.id} className="p-2 rounded bg-muted/50 hover:bg-muted space-y-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-sm truncate">{t.name}</div>
                                {t.user_role === 'leader' && (
                                  <Crown className="h-3 w-3 text-yellow-500" />
                                )}
                              </div>
                              {t.description && (
                                <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {t.member_count || 0}/{t.max_members} members
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleLeaveTeam(t.id)} className="shrink-0">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
