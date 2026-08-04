// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Route, Plus, Trash2, MapPin, Navigation, Eye, EyeOff } from 'lucide-react';
import { useQuestRoutes } from '@/hooks/useQuestRoutes';

interface Quest {
  id: string;
  title: string;
  latitude?: number;
  longitude?: number;
}

interface RoutePanelProps {
  quests: Quest[];
  onRouteSelect?: (questIds: string[]) => void;
}

const ROUTE_COLORS = ['#9b87f5', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444'];

export const RoutePanel = ({ quests, onRouteSelect }: RoutePanelProps) => {
  const { routes, createRoute, deleteRoute } = useQuestRoutes();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedQuestIds, setSelectedQuestIds] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedColor, setSelectedColor] = useState(ROUTE_COLORS[0]);

  const toggleQuestSelection = (questId: string) => {
    setSelectedQuestIds(prev => 
      prev.includes(questId) ? prev.filter(id => id !== questId) : [...prev, questId]
    );
  };

  const handleCreate = async () => {
    if (!newName.trim() || selectedQuestIds.length < 2) return;
    await createRoute(newName, selectedQuestIds, selectedColor, isPublic);
    setCreating(false);
    setNewName('');
    setSelectedQuestIds([]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Quest Routes</CardTitle>
          </div>
          <Button size="sm" variant={creating ? 'secondary' : 'default'} onClick={() => setCreating(!creating)}>
            <Plus className="h-4 w-4 mr-1" />
            {creating ? 'Cancel' : 'New Route'}
          </Button>
        </div>
        <CardDescription>Plan trails connecting multiple quests</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
            <Input placeholder="Route name" value={newName} onChange={e => setNewName(e.target.value)} />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Color:</span>
              {ROUTE_COLORS.map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${selectedColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              <span className="text-sm">{isPublic ? 'Public' : 'Private'}</span>
              {isPublic ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {quests.filter(q => q.latitude && q.longitude).map(quest => (
                <button
                  key={quest.id}
                  className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                    selectedQuestIds.includes(quest.id) ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleQuestSelection(quest.id)}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{quest.title}</span>
                    {selectedQuestIds.includes(quest.id) && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        #{selectedQuestIds.indexOf(quest.id) + 1}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <Button className="w-full" size="sm" onClick={handleCreate} disabled={!newName.trim() || selectedQuestIds.length < 2}>
              <Navigation className="h-4 w-4 mr-1" />
              Create Route ({selectedQuestIds.length} quests)
            </Button>
          </div>
        )}

        {routes.length === 0 && !creating && (
          <p className="text-sm text-muted-foreground text-center py-4">No routes yet. Create one to plan a quest trail!</p>
        )}

        {routes.map(route => (
          <div key={route.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: route.color }} />
              <div>
                <div className="font-medium text-sm">{route.name}</div>
                <div className="text-xs text-muted-foreground">{route.quest_ids.length} quests</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => onRouteSelect?.(route.quest_ids)}>
                <Navigation className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteRoute(route.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
