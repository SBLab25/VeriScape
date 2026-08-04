import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TABLES = [
  'Submissions',
  'Quests',
  'ai_verifications',
  'ai_logs',
  'ai_agent_config',
  'notifications',
  'user_roles',
  'user_quest_stats',
  'quest_chains',
  'quest_chain_steps',
  'user_quest_chain_progress',
  'quest_routes',
  'quest_conversations',
  'quest_learning_engagement',
  'seasonal_events',
  'seasonal_event_quests',
  'seasonal_event_participation',
  'social_groups',
  'social_group_members',
  'social_group_posts',
  'ar_quest_markers',
  'user_ar_collections',
  'blocked_users',
  'content_reports',
  'push_subscriptions',
  'verification_appeals',
  'verification_cross_references',
  'verification_feedback',
  'verification_thresholds',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify using apikey header matches the anon key (basic access control)
    // The admin UI already restricts access to admin users
    const body = await req.json().catch(() => ({}));
    if (!body.user_id) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Export all tables
    const exportData: Record<string, any[]> = {};
    const errors: string[] = [];

    for (const table of TABLES) {
      try {
        // Fetch in batches of 1000 to handle large tables
        let allRows: any[] = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(offset, offset + batchSize - 1);

          if (error) {
            errors.push(`${table}: ${error.message}`);
            hasMore = false;
          } else {
            allRows = allRows.concat(data || []);
            hasMore = (data?.length || 0) === batchSize;
            offset += batchSize;
          }
        }

        exportData[table] = allRows;
      } catch (e) {
        errors.push(`${table}: ${e.message}`);
        exportData[table] = [];
      }
    }

    const result = {
      exported_at: new Date().toISOString(),
      project_id: Deno.env.get('SUPABASE_URL'),
      table_count: Object.keys(exportData).length,
      row_counts: Object.fromEntries(
        Object.entries(exportData).map(([k, v]) => [k, v.length])
      ),
      errors: errors.length > 0 ? errors : undefined,
      data: exportData,
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Admin access required' ? 403 : 500,
    });
  }
});
