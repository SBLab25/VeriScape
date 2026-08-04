import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action, user_id, notification_id, limit: queryLimit } = body;

    // ===== NOTIFICATIONS =====
    if (action === 'get_notifications') {
      if (!user_id) throw new Error('user_id required');
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(queryLimit || 50);
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'mark_notification_read') {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification_id)
        .eq('user_id', user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'mark_all_read') {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user_id)
        .eq('is_read', false);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete_notification') {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notification_id)
        .eq('user_id', user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== QUESTS =====
    if (action === 'ensure_quest') {
      const { quest } = body;
      if (!quest || !quest.id) throw new Error('quest data with id required');
      const { data, error } = await supabase
        .from('quests')
        .upsert({
          id: quest.id,
          title: quest.title || 'Untitled Quest',
          description: quest.description || '',
          category: quest.category || 'general',
          difficulty: quest.difficulty || 'medium',
        }, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== USER STATS (Profile page) =====
    if (action === 'get_user_stats') {
      if (!user_id) throw new Error('user_id required');

      const [totalResult, completedResult, rejectedResult] = await Promise.all([
        supabase.from('Submissions').select('*', { count: 'exact', head: true }).eq('user_id', user_id),
        supabase.from('Submissions').select('*', { count: 'exact', head: true }).eq('user_id', user_id).in('status', ['approved', 'verified']),
        supabase.from('Submissions').select('*', { count: 'exact', head: true }).eq('user_id', user_id).eq('status', 'rejected'),
      ]);

      return new Response(JSON.stringify({
        data: {
          totalSubmissions: totalResult.count || 0,
          completedQuests: completedResult.count || 0,
          rejectedQuests: rejectedResult.count || 0,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== USER SUBMISSIONS (Quest History) =====
    if (action === 'get_user_submissions') {
      if (!user_id) throw new Error('user_id required');
      const { data: submissions, error } = await supabase
        .from('Submissions')
        .select('*')
        .eq('user_id', user_id)
        .order('submitted_at', { ascending: false })
        .limit(queryLimit || 200);
      if (error) throw error;

      // Enrich with quest data
      const enriched = await Promise.all((submissions || []).map(async (sub: any) => {
        let quest = null;
        if (sub.quest_id) {
          const { data: q } = await supabase.from('quests').select('id, title, description, difficulty, category').eq('id', sub.quest_id).maybeSingle();
          quest = q;
        }
        if (!quest && sub.quest_title) {
          quest = { id: sub.quest_id, title: sub.quest_title, description: null, difficulty: null, location: null, quest_type: null };
        }
        return { ...sub, quest };
      }));

      return new Response(JSON.stringify({ data: enriched }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== SUBMISSIONS =====
    if (action === 'create_submission') {
      const { submission } = body;
      if (!submission) throw new Error('submission data required');
      const { data, error } = await supabase
        .from('Submissions')
        .insert(submission)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_submission') {
      const { submission_id, updates } = body;
      if (!submission_id || !updates) throw new Error('submission_id and updates required');
      const { data, error } = await supabase
        .from('Submissions')
        .update(updates)
        .eq('id', submission_id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_submissions') {
      const { data, error } = await supabase
        .from('Submissions')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(queryLimit || 200);
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_user_submission') {
      const { quest_id } = body;
      if (!user_id || !quest_id) throw new Error('user_id and quest_id required');
      const { data, error } = await supabase
        .from('Submissions')
        .select('id, status')
        .eq('quest_id', quest_id)
        .eq('user_id', user_id)
        .neq('status', 'rejected')
        .maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== STORAGE UPLOAD =====
    if (action === 'upload_file') {
      const { bucket, path, base64, contentType } = body;
      if (!bucket || !path || !base64) throw new Error('bucket, path, and base64 required');
      
      // Decode base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, bytes, { contentType: contentType || 'application/octet-stream', upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return new Response(JSON.stringify({ data: { publicUrl: urlData.publicUrl } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== VERIFICATIONS =====
    if (action === 'get_verifications') {
      const { data, error } = await supabase
        .from('ai_verifications')
        .select('*')
        .order('verified_at', { ascending: false })
        .limit(queryLimit || 100);
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_appeals') {
      const { data, error } = await supabase
        .from('verification_appeals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(queryLimit || 50);
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_thresholds') {
      const { data, error } = await supabase
        .from('verification_thresholds')
        .select('*');
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_feedback') {
      const { data, error } = await supabase
        .from('verification_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(queryLimit || 50);
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_threshold') {
      const { threshold_key, threshold_value } = body;
      if (!threshold_key || threshold_value === undefined) throw new Error('threshold_key and threshold_value required');
      const { data, error } = await supabase
        .from('verification_thresholds')
        .update({ threshold_value, last_adjusted_at: new Date().toISOString() })
        .eq('threshold_key', threshold_key)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_submission_with_quest') {
      const { submission_id } = body;
      if (!submission_id) throw new Error('submission_id required');
      const { data: submission, error: subErr } = await supabase
        .from('Submissions')
        .select('*')
        .eq('id', submission_id)
        .single();
      if (subErr) throw subErr;

      let quest = null;
      if (submission?.quest_id) {
        const { data: questData } = await supabase
          .from('quests')
          .select('*')
          .eq('id', submission.quest_id)
          .single();
        quest = questData;
      }

      return new Response(JSON.stringify({ data: { submission, quest } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
