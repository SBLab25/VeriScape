import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface AgentContext {
  userId: string;
  location?: { lat: number; lng: number; address?: string };
  timeOfDay: string;
  dayOfWeek: string;
  questHistory: string[];
  userLevel: number;
  preferredCategory?: string;
  successRate: number;
  action: 'generate' | 'chain' | 'retire' | 'collaborative';
}

async function fetchRecentQuestTitles(supabase: any) {
  const { data, error } = await supabase
    .from('Quests')
    .select('title')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claims?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const userId = claims.user.id;

    const body = await req.json();
    const action = body.action || 'generate';

    // Fetch AI agent config (model preferences)
    const { data: configRows } = await supabase
      .from('ai_agent_config')
      .select('config_key, config_value');

    const llmConfig = configRows?.find((c: any) => c.config_key === 'llm_model')?.config_value || {};
    const agentSettings = configRows?.find((c: any) => c.config_key === 'agent_settings')?.config_value || {};
    const enabledConfig = configRows?.find((c: any) => c.config_key === 'agent_enabled')?.config_value as any;

    // Check if agent is disabled
    if (enabledConfig && enabledConfig.enabled === false) {
      return new Response(JSON.stringify({ error: 'AI Agent is currently disabled by admin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const modelToUse = llmConfig.model || 'google/gemini-3-flash-preview';
    const customApiKey = llmConfig.custom_api_key;
    const provider = llmConfig.provider || 'lovable';

    // Gather context
    const [statsRes, recentQuests, profileRes] = await Promise.all([
      supabase.from('user_quest_stats').select('*').eq('user_id', userId).maybeSingle(),
      fetchRecentQuestTitles(supabase),
      supabase.from('ai_generated_quests').select('title').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    ]);

    const stats = statsRes.data;
    const recentAiQuests = profileRes.data || [];
    const allRecentTitles = [...recentQuests.map((q: any) => q.title), ...recentAiQuests.map((q: any) => q.title)];

    const now = new Date();
    const hours = now.getHours();
    const timeOfDay = hours < 6 ? 'night' : hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : hours < 21 ? 'evening' : 'night';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[now.getDay()];

    const context: AgentContext = {
      userId,
      location: body.location || undefined,
      timeOfDay,
      dayOfWeek,
      questHistory: allRecentTitles,
      userLevel: stats?.current_level || 1,
      preferredCategory: stats?.preferred_category || undefined,
      successRate: stats?.success_rate || 0,
      action,
    };

    let result;

    switch (action) {
      case 'generate':
        result = await generateContextualQuests(supabase, context, modelToUse, provider, customApiKey, agentSettings);
        break;
      case 'chain':
        result = await createQuestChain(supabase, context, modelToUse, provider, customApiKey);
        break;
      case 'retire':
        result = await retireStaleQuests(supabase, agentSettings);
        break;
      case 'collaborative':
        result = await generateCollaborativeQuest(supabase, context, modelToUse, provider, customApiKey);
        break;
      default:
        result = { error: 'Unknown action' };
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Quest Master Agent error:', error);
    const status = error.message?.includes('Rate limit') ? 429 :
                   error.message?.includes('Payment') ? 402 : 500;
    return new Response(JSON.stringify({ error: error.message || 'Agent error' }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function callLLM(model: string, provider: string, customApiKey: string | null, messages: any[]) {
  // Always use Lovable AI gateway unless custom key is set with a non-lovable provider
  if (provider === 'lovable' || !customApiKey) {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, temperature: 0.85 }),
    });

    if (response.status === 429) throw new Error('Rate limits exceeded, please try again later.');
    if (response.status === 402) throw new Error('Payment required, please add funds.');
    if (!response.ok) {
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // Custom provider (OpenAI-compatible)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature: 0.85 }),
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Custom LLM error: ${response.status} - ${t}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(text: string) {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return JSON.parse(match ? match[1] : text);
  } catch {
    // Try extracting JSON object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error('Failed to parse AI response as JSON');
  }
}

async function generateContextualQuests(supabase: any, ctx: AgentContext, model: string, provider: string, customApiKey: string | null, settings: any) {
  const difficultyHint = ctx.userLevel >= 15 && ctx.successRate >= 0.7 ? 'legendary' :
                         ctx.userLevel >= 8 && ctx.successRate >= 0.6 ? 'hard' :
                         ctx.userLevel >= 3 && ctx.successRate >= 0.5 ? 'medium' : 'easy';

  const systemPrompt = `You are the Quest Master Agent for Discovery Atlas, an exploration and adventure app. You create personalized, contextual quests that are engaging, safe, and achievable.

Your quests should consider:
- Time of day: ${ctx.timeOfDay} (${ctx.dayOfWeek})
- User level: ${ctx.userLevel} (recommend difficulty: ${difficultyHint})
- Success rate: ${(ctx.successRate * 100).toFixed(0)}%
- Recent quests to avoid: ${ctx.questHistory.slice(0, 5).join(', ') || 'none'}
${ctx.location ? `- Location: lat ${ctx.location.lat}, lng ${ctx.location.lng}${ctx.location.address ? ` (${ctx.location.address})` : ''}` : '- No location provided, create location-agnostic quests'}
${ctx.preferredCategory ? `- Preferred category: ${ctx.preferredCategory}` : ''}

Quest types: discovery, photography, nature, history, science, community, adventure, culture, social, truth, dare, knowledge, creative

Generate 2 unique quests. Return ONLY valid JSON array:
[{
  "title": "string (max 60 chars)",
  "description": "string (200-400 chars with specific instructions)",
  "quest_type": "one of the types above",
  "difficulty": ${difficultyHint === 'easy' ? 1 : difficultyHint === 'medium' ? 2 : difficultyHint === 'hard' ? 3 : 4},
  "location": "specific area or 'anywhere'",
  "objectives": [{"description": "step 1"}, {"description": "step 2"}, {"description": "step 3"}],
  "xp_reward": number (50-500 based on difficulty),
  "estimated_minutes": number (15-90),
  "time_sensitive": boolean,
  "collaborative": boolean
}]`;

  const content = await callLLM(model, provider, customApiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Generate contextual quests based on the current conditions.' }
  ]);

  const quests = parseJSON(content);
  const inserted: any[] = [];

  for (const quest of (Array.isArray(quests) ? quests : [quests])) {
    // Insert into ai_generated_quests
    const { data, error } = await supabase
      .from('ai_generated_quests')
      .insert({
        user_id: ctx.userId,
        title: quest.title,
        description: quest.description,
        quest_type: quest.quest_type,
        difficulty: quest.difficulty || 2,
        location: quest.location || 'anywhere',
        latitude: ctx.location?.lat || null,
        longitude: ctx.location?.lng || null,
        generated_by: 'quest-master-agent',
        generation_prompt: `${ctx.timeOfDay} | ${ctx.dayOfWeek} | Level ${ctx.userLevel}`
      })
      .select()
      .single();

    if (!error && data) inserted.push(data);
  }

  return { quests: inserted, generated: inserted.length };
}

async function createQuestChain(supabase: any, ctx: AgentContext, model: string, provider: string, customApiKey: string | null) {
  const systemPrompt = `You are the Quest Master Agent. Create a multi-step quest chain (storyline) for a level ${ctx.userLevel} user.
${ctx.location ? `Location: lat ${ctx.location.lat}, lng ${ctx.location.lng}` : 'No specific location'}

Generate a quest chain with 3-5 steps. Return ONLY valid JSON:
{
  "title": "Chain title",
  "description": "Overall storyline",
  "category": "adventure|discovery|social|creative",
  "difficulty": "easy|medium|hard|legendary",
  "storyline": "Narrative connecting the steps",
  "steps": [
    {
      "title": "Step title",
      "description": "Step description",
      "narrative": "Story context for this step",
      "objectives": [{"description": "objective"}],
      "xp_reward": 100
    }
  ]
}`;

  const content = await callLLM(model, provider, customApiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Create an engaging quest chain storyline.' }
  ]);

  const chain = parseJSON(content);

  const { data: chainData, error: chainError } = await supabase
    .from('quest_chains')
    .insert({
      title: chain.title,
      description: chain.description,
      category: chain.category || 'adventure',
      difficulty: chain.difficulty || 'medium',
      storyline: chain.storyline,
      total_steps: chain.steps?.length || 3,
      total_xp_reward: chain.steps?.reduce((sum: number, s: any) => sum + (s.xp_reward || 100), 0) || 500,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (chainError) throw new Error(`Failed to create chain: ${chainError.message}`);

  // Insert steps
  if (chain.steps && chainData) {
    for (let i = 0; i < chain.steps.length; i++) {
      const step = chain.steps[i];
      await supabase.from('quest_chain_steps').insert({
        chain_id: chainData.id,
        step_number: i + 1,
        title: step.title,
        description: step.description,
        narrative: step.narrative,
        objectives: step.objectives || [],
        xp_reward: step.xp_reward || 100,
      });
    }
  }

  return { chain: chainData, steps: chain.steps?.length || 0 };
}

async function retireStaleQuests(supabase: any, settings: any) {
  const retireDays = settings.auto_retire_days || 7;
  const cutoff = new Date(Date.now() - retireDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('ai_generated_quests')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('created_at', cutoff)
    .select('id');

  return { retired: data?.length || 0, error: error?.message };
}

async function generateCollaborativeQuest(supabase: any, ctx: AgentContext, model: string, provider: string, customApiKey: string | null) {
  const systemPrompt = `You are the Quest Master Agent. Create a collaborative group quest for 2-5 players at level ~${ctx.userLevel}.
${ctx.location ? `Location: lat ${ctx.location.lat}, lng ${ctx.location.lng}` : 'No specific location'}

Return ONLY valid JSON:
{
  "title": "Quest title (max 60 chars)",
  "description": "Group quest description (200-400 chars)",
  "quest_type": "community",
  "difficulty": 3,
  "location": "area or anywhere",
  "min_players": 2,
  "max_players": 5,
  "objectives": [{"description": "team objective 1"}, {"description": "team objective 2"}],
  "xp_reward": 300,
  "time_limit_hours": 24
}`;

  const content = await callLLM(model, provider, customApiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Create a fun collaborative quest for a group.' }
  ]);

  const quest = parseJSON(content);

  const { data, error } = await supabase
    .from('ai_generated_quests')
    .insert({
      user_id: ctx.userId,
      title: quest.title,
      description: quest.description,
      quest_type: quest.quest_type || 'community',
      difficulty: quest.difficulty || 3,
      location: quest.location || 'anywhere',
      latitude: ctx.location?.lat || null,
      longitude: ctx.location?.lng || null,
      generated_by: 'quest-master-agent',
      generation_prompt: `collaborative | ${quest.min_players}-${quest.max_players} players`
    })
    .select()
    .single();

  return { quest: data, collaborative: true };
}
