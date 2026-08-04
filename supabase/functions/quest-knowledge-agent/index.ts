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

interface ChatRequest {
  action: 'chat' | 'hint' | 'facts' | 'quiz' | 'learn';
  message?: string;
  questId?: string;
  conversationId?: string;
  factCategory?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Auth
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

    const body: ChatRequest = await req.json();
    const { action = 'chat', message, questId, conversationId, factCategory } = body;

    // Fetch user learning preferences
    const { data: learningData } = await supabase
      .from('quest_learning_engagement')
      .select('*')
      .eq('user_id', userId);

    const learningProfile = learningData || [];
    const depthMap: Record<string, string> = {};
    learningProfile.forEach((l: any) => { depthMap[l.fact_category] = l.preferred_depth; });

    // Fetch quest context if questId provided
    let questContext = '';
    if (questId) {
      // Try both Quests table and ai_generated_quests
      const [regularQ, aiQ] = await Promise.all([
        supabase.from('Quests').select('*').eq('id', questId).maybeSingle(),
        supabase.from('ai_generated_quests').select('*').eq('id', questId).maybeSingle(),
      ]);
      const quest = regularQ.data || aiQ.data;
      if (quest) {
        questContext = `
Current Quest Context:
- Title: ${quest.title}
- Description: ${quest.description}
- Type: ${quest.quest_type || quest.category || 'general'}
- Difficulty: ${quest.difficulty}
- Location: ${quest.location || 'Not specified'}
${quest.objectives ? `- Objectives: ${JSON.stringify(quest.objectives)}` : ''}`;
      }
    }

    // Fetch conversation history
    let conversationMessages: any[] = [];
    let convId = conversationId;
    if (convId) {
      const { data: conv } = await supabase
        .from('quest_conversations')
        .select('messages')
        .eq('id', convId)
        .eq('user_id', userId)
        .maybeSingle();
      if (conv) {
        conversationMessages = conv.messages || [];
      }
    }

    // Fetch available quests for RAG context from the canonical Discovery Atlas table.
    const { data: availableQuests, error: questsError } = await supabase
      .from('Quests')
      .select('id, title, description, quest_type, difficulty, location')
      .eq('is_active', true)
      .limit(30);

    if (questsError) {
      throw questsError;
    }

    const questKnowledgeBase = (availableQuests || []).map((q: any) =>
      `• ${q.title} (${q.quest_type || q.category}, difficulty: ${q.difficulty}, location: ${q.location || 'anywhere'}): ${q.description?.substring(0, 120)}`
    ).join('\n');

    // User stats for personalization
    const { data: stats } = await supabase
      .from('user_quest_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const userContext = stats ? `
User Profile:
- Level: ${stats.current_level}
- Total XP: ${stats.total_xp}
- Quests Completed: ${stats.total_completed}
- Success Rate: ${(stats.success_rate * 100).toFixed(0)}%
- Preferred Category: ${stats.preferred_category || 'none'}` : '';

    const learningPrefs = learningProfile.length > 0
      ? `\nLearning Preferences:\n${learningProfile.map((l: any) =>
          `- ${l.fact_category}: depth=${l.preferred_depth}, engagements=${l.engagement_count}`
        ).join('\n')}`
      : '';

    let systemPrompt = '';
    let userMessage = message || '';

    switch (action) {
      case 'chat':
        systemPrompt = `You are the Quest Knowledge Guide for Discovery Atlas — an exploration and adventure app. You are an expert on local history, geography, nature, culture, and safety guidelines.

Your role:
1. Answer questions about quests, locations, and exploration topics
2. Provide interesting facts related to quest themes
3. Offer safety tips when relevant
4. Be engaging, concise, and educational
5. Reference specific quests when relevant

${questContext}
${userContext}
${learningPrefs}

Available Quests Knowledge Base:
${questKnowledgeBase}

Rules:
- Keep responses under 200 words unless asked for detail
- Use emoji sparingly for visual appeal
- If asked about a specific quest, provide detailed guidance
- Always prioritize safety information
- Be encouraging and supportive
- Format with markdown for readability`;
        break;

      case 'hint':
        systemPrompt = `You are the Quest Hint System for Discovery Atlas. Provide helpful hints for completing quests without giving away the full answer.
${questContext}
${userContext}

Rules:
- Give progressive hints (vague first, more specific if asked again)
- Never reveal the complete solution
- Encourage exploration and discovery
- Keep hints under 100 words
- Use 💡 emoji for hint formatting`;
        userMessage = message || 'I need a hint for this quest';
        break;

      case 'facts':
        const depth = depthMap[factCategory || 'general'] || 'medium';
        systemPrompt = `You are an educational fact generator for Discovery Atlas. Share fascinating facts related to quests and exploration.
${questContext}

Information depth preference: ${depth}
Category focus: ${factCategory || 'general'}

Rules:
- Share 2-3 interesting facts
- Adjust complexity based on depth preference (simple/medium/detailed)
- Connect facts to the quest theme when possible
- Include a "Did you know?" style intro
- Keep it engaging and memorable
- Use 🧠 📚 🌍 emojis appropriately`;
        userMessage = message || `Share interesting facts about ${factCategory || 'exploration'}`;
        break;

      case 'quiz':
        systemPrompt = `You are a quiz master for Discovery Atlas. Generate a fun micro-challenge quiz question related to quests and exploration.
${questContext}
${userContext}

Rules:
- Create ONE multiple-choice question with 4 options (A, B, C, D)
- The question should relate to the quest theme, location, or general exploration knowledge
- Include the correct answer at the end marked as "Answer: X"
- Add a brief fun fact after the answer
- Format clearly with markdown
- Difficulty should match user level
- Use 🎯 emoji for the question`;
        userMessage = message || 'Generate a quiz question';
        break;

      case 'learn':
        systemPrompt = `You are a learning companion for Discovery Atlas. Provide an in-depth educational mini-lesson related to exploration topics.
${questContext}
${userContext}
${learningPrefs}

Rules:
- Structure as a mini-lesson with clear sections
- Include "Key Takeaway" at the end
- Adjust depth based on user's learning preferences
- Connect to practical quest completion where possible
- Keep under 300 words
- Use headers and bullet points for readability`;
        userMessage = message || `Teach me about ${factCategory || 'exploration skills'}`;
        break;
    }

    // Build conversation for AI
    const aiMessages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 10 messages for context window management)
    const recentHistory = conversationMessages.slice(-10);
    for (const msg of recentHistory) {
      aiMessages.push({ role: msg.role, content: msg.content });
    }

    aiMessages.push({ role: 'user', content: userMessage });

    // Call Lovable AI
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResponse = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: aiMessages,
        temperature: action === 'quiz' ? 0.9 : 0.7,
      }),
    });

    if (aiResponse.status === 429) throw new Error('Rate limits exceeded, please try again later.');
    if (aiResponse.status === 402) throw new Error('Payment required, please add funds.');
    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error('AI error:', aiResponse.status, t);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';

    // Save conversation
    const newMessages = [
      ...conversationMessages,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ];

    // Keep only last 50 messages per conversation
    const trimmedMessages = newMessages.slice(-50);

    if (convId) {
      await supabase
        .from('quest_conversations')
        .update({ messages: trimmedMessages, updated_at: new Date().toISOString() })
        .eq('id', convId)
        .eq('user_id', userId);
    } else {
      const { data: newConv } = await supabase
        .from('quest_conversations')
        .insert({
          user_id: userId,
          quest_id: questId || null,
          messages: trimmedMessages,
          context_type: action,
        })
        .select('id')
        .single();
      convId = newConv?.id;
    }

    // Track learning engagement
    if (action === 'facts' || action === 'learn' || action === 'quiz') {
      const cat = factCategory || 'general';
      const { data: existing } = await supabase
        .from('quest_learning_engagement')
        .select('*')
        .eq('user_id', userId)
        .eq('fact_category', cat)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('quest_learning_engagement')
          .update({
            engagement_count: existing.engagement_count + 1,
            last_engaged_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('quest_learning_engagement')
          .insert({ user_id: userId, fact_category: cat });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      reply,
      conversationId: convId,
      action,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Quest Knowledge Agent error:', error);
    const status = error.message?.includes('Rate limit') ? 429 :
                   error.message?.includes('Payment') ? 402 : 500;
    return new Response(JSON.stringify({ error: error.message || 'Agent error' }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
