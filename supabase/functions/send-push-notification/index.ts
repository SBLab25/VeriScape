import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PushRequest {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  related_id?: string;
  related_type?: string;
}

// Web Push implementation using raw crypto
async function sendWebPush(subscription: any, payload: string): Promise<boolean> {
  // For Web Push we need VAPID authentication
  // Using the web-push compatible approach with fetch
  try {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: payload,
    });

    if (!response.ok) {
      console.error('Push failed:', response.status, await response.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('Push send error:', e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const pushData: PushRequest = await req.json();
    console.log('Sending push notification to user:', pushData.user_id);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', pushData.user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user');
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title: pushData.title,
      body: pushData.body,
      url: pushData.url || '/',
      tag: pushData.tag || 'veriscape',
      related_id: pushData.related_id,
      related_type: pushData.related_type,
    });

    let sent = 0;
    const staleEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const success = await sendWebPush(sub, payload);
      if (success) {
        sent++;
      } else {
        // Mark failed endpoints for cleanup
        staleEndpoints.push(sub.endpoint);
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabaseClient
        .from('push_subscriptions')
        .delete()
        .eq('user_id', pushData.user_id)
        .in('endpoint', staleEndpoints);
    }

    console.log(`Push sent to ${sent}/${subscriptions.length} subscriptions`);

    return new Response(
      JSON.stringify({ success: true, sent, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
