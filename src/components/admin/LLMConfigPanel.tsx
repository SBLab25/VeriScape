import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuestMasterAgent } from '@/hooks/useQuestMasterAgent';
import { Bot, Key, Save, Zap, Shield, RefreshCw, Power, Play, Link2, Trash2, Users } from 'lucide-react';

const AVAILABLE_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Fast)', provider: 'lovable', tier: 'fast' },
  { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro (Best)', provider: 'lovable', tier: 'premium' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'lovable', tier: 'premium' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'lovable', tier: 'balanced' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Cheapest)', provider: 'lovable', tier: 'economy' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Powerful)', provider: 'lovable', tier: 'premium' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', provider: 'lovable', tier: 'balanced' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano (Fast)', provider: 'lovable', tier: 'economy' },
  { value: 'openai/gpt-5.2', label: 'GPT-5.2 (Latest)', provider: 'lovable', tier: 'premium' },
  { value: 'custom', label: '🔑 Custom API Key', provider: 'custom', tier: 'custom' },
];

const TIER_COLORS: Record<string, string> = {
  fast: 'bg-green-500/10 text-green-600 border-green-500/20',
  premium: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  balanced: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  economy: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  custom: 'bg-muted text-muted-foreground border-border',
};

export const LLMConfigPanel = () => {
  const { toast } = useToast();
  const { invoke: invokeAgent, loading: agentLoading } = useQuestMasterAgent();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState('google/gemini-3-flash-preview');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customModelName, setCustomModelName] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, { status: string; detail: string } | null>>({});
  const [agentSettings, setAgentSettings] = useState({
    auto_retire_days: 7,
    max_quests_per_day: 10,
    difficulty_scaling: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agent_config')
        .select('config_key, config_value');

      if (error) throw error;

      const llm = data?.find((c: any) => c.config_key === 'llm_model')?.config_value as any;
      const settings = data?.find((c: any) => c.config_key === 'agent_settings')?.config_value as any;
      const enabledConfig = data?.find((c: any) => c.config_key === 'agent_enabled')?.config_value as any;

      if (llm) {
        if (llm.provider === 'custom') {
          setUseCustom(true);
          setCustomApiKey(llm.custom_api_key || '');
          setCustomModelName(llm.model || '');
        } else {
          setSelectedModel(llm.model || 'google/gemini-3-flash-preview');
          setUseCustom(false);
        }
      }

      if (enabledConfig !== undefined && enabledConfig !== null) {
        setAgentEnabled(enabledConfig.enabled !== false);
      }
      if (settings) {
        setAgentSettings({
          auto_retire_days: settings.auto_retire_days ?? 7,
          max_quests_per_day: settings.max_quests_per_day ?? 10,
          difficulty_scaling: settings.difficulty_scaling ?? true,
        });
      }
    } catch (err) {
      console.error('Error fetching AI config:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const llmPayload = useCustom
        ? { provider: 'custom', model: customModelName, custom_api_key: customApiKey }
        : { provider: 'lovable', model: selectedModel, custom_api_key: null };

      const { error: llmError } = await supabase
        .from('ai_agent_config')
        .update({ config_value: llmPayload, updated_at: new Date().toISOString() })
        .eq('config_key', 'llm_model');

      const { error: settingsError } = await supabase
        .from('ai_agent_config')
        .update({ config_value: agentSettings, updated_at: new Date().toISOString() })
        .eq('config_key', 'agent_settings');

      // Upsert agent_enabled
      await supabase
        .from('ai_agent_config')
        .upsert({
          config_key: 'agent_enabled',
          config_value: { enabled: agentEnabled },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'config_key' });

      if (llmError) throw llmError;
      if (settingsError) throw settingsError;

      toast({ title: 'Saved', description: 'AI agent configuration updated successfully.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save config', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (action: 'generate' | 'chain' | 'retire' | 'collaborative') => {
    setTestResults(prev => ({ ...prev, [action]: { status: 'running', detail: 'Running...' } }));
    try {
      const result = await invokeAgent(action);
      if (result) {
        const details: Record<string, string> = {
          generate: `${result.generated || 0} quests generated`,
          chain: `Chain created with ${result.chain ? 'success' : 'no data'}`,
          retire: `${result.retired || 0} stale quests retired`,
          collaborative: result.quests ? 'Collaborative quest created' : 'No quest returned',
        };
        setTestResults(prev => ({ ...prev, [action]: { status: 'success', detail: details[action] || 'Done' } }));
      } else {
        setTestResults(prev => ({ ...prev, [action]: { status: 'error', detail: 'Agent returned null — check logs' } }));
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [action]: { status: 'error', detail: e.message || 'Failed' } }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentModelInfo = AVAILABLE_MODELS.find(m => m.value === selectedModel);

  const TEST_ACTIONS = [
    { action: 'generate' as const, label: 'Generate Quests', icon: Play, desc: 'Create 2 contextual quests based on your profile' },
    { action: 'chain' as const, label: 'Create Quest Chain', icon: Link2, desc: 'Generate a multi-step narrative storyline' },
    { action: 'retire' as const, label: 'Retire Stale Quests', icon: Trash2, desc: 'Deactivate quests older than configured days' },
    { action: 'collaborative' as const, label: 'Collaborative Quest', icon: Users, desc: 'Create a group quest for 2-5 players' },
  ];

  return (
    <div className="space-y-6">
      {/* Agent Power Toggle */}
      <Card className={!agentEnabled ? 'border-destructive/40 opacity-80' : 'border-primary/30'}>
        <CardContent className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <Power className={`h-6 w-6 ${agentEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-semibold text-sm">Quest Master Agent</p>
              <p className="text-xs text-muted-foreground">
                {agentEnabled ? 'Agent is active and ready to generate quests' : 'Agent is disabled — no AI quests will be generated'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={agentEnabled ? 'default' : 'secondary'}>
              {agentEnabled ? 'ON' : 'OFF'}
            </Badge>
            <Switch checked={agentEnabled} onCheckedChange={setAgentEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            LLM Model Configuration
          </CardTitle>
          <CardDescription>
            Choose which AI model powers the Quest Master Agent. Built-in models use Lovable AI — no API key needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={useCustom} onCheckedChange={setUseCustom} />
            <span className="text-sm font-medium">Use custom API key</span>
            {useCustom && <Badge variant="outline" className="text-xs"><Key className="h-3 w-3 mr-1" />Custom</Badge>}
          </div>

          {!useCustom ? (
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a model" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.filter(m => m.provider === 'lovable').map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        <span>{m.label}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${TIER_COLORS[m.tier]}`}>
                          {m.tier}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentModelInfo && (
                <p className="text-xs text-muted-foreground">
                  {currentModelInfo.tier === 'premium' && '🏆 Best quality, higher cost. Great for complex quest generation.'}
                  {currentModelInfo.tier === 'fast' && '⚡ Very fast with good quality. Recommended default.'}
                  {currentModelInfo.tier === 'balanced' && '⚖️ Good balance of speed and quality.'}
                  {currentModelInfo.tier === 'economy' && '💰 Most cost-effective. Good for simple quests.'}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border border-dashed border-border bg-muted/30">
              <div>
                <label className="text-sm font-medium">Model Name</label>
                <Input
                  placeholder="e.g. gpt-4o, claude-3-opus, etc."
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  <Key className="h-3 w-3" /> API Key
                </label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Stored securely in the database. Only accessible by the agent.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Agent Behavior Settings
          </CardTitle>
          <CardDescription>Configure how the Quest Master Agent operates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Auto-retire stale quests after (days)</label>
              <Input
                type="number"
                min={1}
                max={30}
                value={agentSettings.auto_retire_days}
                onChange={(e) => setAgentSettings(s => ({ ...s, auto_retire_days: parseInt(e.target.value) || 7 }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max quests generated per day</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={agentSettings.max_quests_per_day}
                onChange={(e) => setAgentSettings(s => ({ ...s, max_quests_per_day: parseInt(e.target.value) || 10 }))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={agentSettings.difficulty_scaling}
              onCheckedChange={(v) => setAgentSettings(s => ({ ...s, difficulty_scaling: v }))}
            />
            <span className="text-sm font-medium">Adaptive difficulty scaling</span>
            <span className="text-xs text-muted-foreground">Auto-adjust quest difficulty based on user performance</span>
          </div>
        </CardContent>
      </Card>

      {/* Test Agent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Test Agent Actions
          </CardTitle>
          <CardDescription>Run each agent action to verify it works with the current configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEST_ACTIONS.map(({ action, label, icon: Icon, desc }) => {
              const result = testResults[action];
              return (
                <div key={action} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={agentLoading || !agentEnabled}
                      onClick={() => runTest(action)}
                    >
                      {agentLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Run'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                  {result && (
                    <div className={`text-xs px-2 py-1 rounded ${
                      result.status === 'success' ? 'bg-green-500/10 text-green-600' :
                      result.status === 'error' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {result.status === 'running' && <RefreshCw className="h-3 w-3 animate-spin inline mr-1" />}
                      {result.detail}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};
