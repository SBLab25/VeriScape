import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VerificationRequest {
  submissionId: string;
  photoUrl: string;
  questTitle: string;
  questDescription: string;
  questLocation: string;
  questLatitude?: number;
  questLongitude?: number;
  userLatitude?: number;
  userLongitude?: number;
}

interface AppealRequest {
  appealId: string;
  verificationId: string;
  appealReason: string;
  photoUrl: string;
  questTitle: string;
  questDescription: string;
}

interface AgentScore {
  agent: string;
  score: number;
  weight: number;
  explanation: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const action = body.action || 'verify';

    // Auth - try token first, fall back to userId in body
    let userId: string | null = body.userId || null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && !userId) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) userId = user.id;
      } catch { }
    }
    console.log('User ID resolved:', userId);

    switch (action) {
      case 'verify':
        return await handleVerification(supabase, body as VerificationRequest, userId, lovableApiKey, startTime);
      case 'appeal_review':
        return await handleAppealReview(supabase, body as AppealRequest, lovableApiKey);
      case 'cross_reference':
        return await handleCrossReference(supabase, body.verificationId, lovableApiKey);
      case 'apply_feedback':
        return await handleApplyFeedback(supabase, body.verificationId, body.correctedVerdict, body.adminId, body.notes);
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: any) {
    console.error('Agent error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      verification: {
        id: crypto.randomUUID(),
        final_confidence: 0.5,
        verdict: 'uncertain',
        reason: `Agent error: ${error.message}. Manual review required.`,
        agent_scores: {},
        agent_explanations: [{ agent: 'system', explanation: error.message }],
      }
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ===== ADAPTIVE THRESHOLDS =====
async function getThresholds(supabase: any): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('verification_thresholds')
    .select('threshold_key, threshold_value');
  
  const defaults: Record<string, number> = {
    verify_min_confidence: 0.75,
    reject_max_confidence: 0.4,
    appeal_auto_approve_confidence: 0.8,
    cross_reference_similarity: 0.85,
  };
  
  if (data) {
    for (const row of data) {
      defaults[row.threshold_key] = parseFloat(row.threshold_value);
    }
  }
  return defaults;
}

// ===== MULTI-AGENT VERIFICATION =====
async function handleVerification(
  supabase: any,
  request: VerificationRequest,
  userId: string | null,
  apiKey: string,
  startTime: number
) {
  console.log('🤖 Multi-agent verification starting...');
  
  const thresholds = await getThresholds(supabase);
  const agentScores: AgentScore[] = [];

  // Agent 1: Context Analysis (via Lovable AI)
  const contextResult = await runContextAgent(request, apiKey);
  agentScores.push(contextResult);

  // Agent 2: Geolocation Validation (heuristic)
  const geoResult = runGeolocationAgent(request);
  agentScores.push(geoResult);

  // Agent 3: Authenticity Detection (via Lovable AI)
  const authResult = await runAuthenticityAgent(request, apiKey);
  agentScores.push(authResult);

  // Agent 4: Scene Relevance (via Lovable AI combined call)
  const sceneResult = await runSceneRelevanceAgent(request, apiKey);
  agentScores.push(sceneResult);

  // Agent 5: Deepfake Detection (via Lovable AI)
  const deepfakeResult = await runDeepfakeAgent(request, apiKey);
  agentScores.push(deepfakeResult);

  // Generate Analysis Report (via Lovable AI)
  const analysisReport = await generateAnalysisReport(request, apiKey, agentScores);

  // Compute weighted final confidence
  let totalWeight = 0;
  let weightedSum = 0;
  for (const s of agentScores) {
    weightedSum += s.score * s.weight;
    totalWeight += s.weight;
  }
  const finalConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  // Check auto-accept criteria FIRST (before standard thresholds)
  const contextScore = agentScores.find(a => a.agent === 'context')?.score ?? 0;
  const authenticityScoreVal = agentScores.find(a => a.agent === 'authenticity')?.score ?? 0;
  const sceneRelevanceScore = agentScores.find(a => a.agent === 'scene_relevance')?.score ?? 0;
  const autoMinConfidence = thresholds.auto_accept_min_confidence ?? 0.50;
  const autoMinAuthenticity = thresholds.auto_accept_min_authenticity ?? 0.60;
  const autoMinContext = thresholds.auto_accept_min_context ?? 0.50;
  const autoMinScene = thresholds.auto_accept_min_scene_relevance ?? 0.50;

  let verdict: 'verified' | 'uncertain' | 'rejected';

  // Auto-accept rule: individual agent scores all meet configurable thresholds
  if (
    finalConfidence >= autoMinConfidence &&
    authenticityScoreVal >= autoMinAuthenticity &&
    contextScore >= autoMinContext &&
    sceneRelevanceScore >= autoMinScene
  ) {
    console.log('✅ Auto-accept triggered: all agent scores meet configurable thresholds');
    console.log(`   Confidence: ${finalConfidence} >= ${autoMinConfidence}, Authenticity: ${authenticityScoreVal} >= ${autoMinAuthenticity}, Context: ${contextScore} >= ${autoMinContext}, Scene: ${sceneRelevanceScore} >= ${autoMinScene}`);
    verdict = 'verified';
  }
  // Standard adaptive thresholds
  else if (finalConfidence >= thresholds.verify_min_confidence) verdict = 'verified';
  else if (finalConfidence <= thresholds.reject_max_confidence) verdict = 'rejected';
  else verdict = 'uncertain';

  // Auto-reject if deepfake detection flags as FAKE
  const deepfakeIsFake = deepfakeResult.score < 0.5;
  if (deepfakeIsFake) {
    console.log('🚨 Deepfake detected as FAKE — auto-rejecting submission');
    verdict = 'rejected';
  }

  const explanations = agentScores.map(s => ({
    agent: s.agent,
    score: s.score,
    weight: s.weight,
    explanation: s.explanation,
  }));

  const reason = agentScores.map(s => `${s.agent}: ${(s.score * 100).toFixed(0)}% - ${s.explanation}`).join(' | ');
  const executionTime = Date.now() - startTime;

  // Store verification
  let verification: any = null;
  if (userId) {
    const { data, error } = await supabase
      .from('ai_verifications')
      .insert({
        user_id: userId,
        submission_id: request.submissionId,
        photo_url: request.photoUrl,
        quest_match_score: agentScores.find(a => a.agent === 'context')?.score ?? 0.5,
        geolocation_match_score: agentScores.find(a => a.agent === 'geolocation')?.score ?? 0.5,
        authenticity_score: agentScores.find(a => a.agent === 'authenticity')?.score ?? 0.5,
        scene_relevance_score: agentScores.find(a => a.agent === 'scene_relevance')?.score ?? 0.5,
        final_confidence: finalConfidence,
        verdict,
        reason,
        model_used: 'multi-agent-v2',
        agent_scores: Object.fromEntries(agentScores.map(s => [s.agent, s.score])),
        agent_explanations: explanations,
        verification_stage: 'complete',
        deepfake_verdict: deepfakeResult.score >= 0.5 ? 'REAL' : 'FAKE',
        deepfake_confidence: deepfakeResult.score,
        analysis_report: analysisReport,
        analyzed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error) verification = data;
    else console.error('Insert error:', error);

    // Log
    await supabase.from('ai_logs').insert({
      user_id: userId,
      submission_id: request.submissionId,
      verification_id: verification?.id,
      model_used: 'multi-agent-v2',
      confidence_score: finalConfidence,
      execution_time_ms: executionTime,
      status: 'success',
    });

    // Auto-approve/reject submission and send notification
    if (verdict === 'verified') {
      await supabase.from('Submissions').update({ status: 'approved' }).eq('id', request.submissionId);
      await supabase.from('notifications').insert({
        user_id: userId,
        title: '✅ Quest Submission Approved',
        message: `Your submission for "${request.questTitle}" has been verified and approved by our AI system.`,
        type: 'quest_approved',
        related_id: request.submissionId,
        related_type: 'submission',
      });
    } else if (verdict === 'rejected') {
      await supabase.from('Submissions').update({ status: 'rejected' }).eq('id', request.submissionId);
      await supabase.from('notifications').insert({
        user_id: userId,
        title: deepfakeIsFake ? '🚫 Quest Rejected — AI-Generated Image Detected' : '❌ Quest Submission Rejected',
        message: deepfakeIsFake
          ? `Your submission for "${request.questTitle}" was rejected because it was flagged as an AI-generated or manipulated image. Please submit an authentic photo. You can appeal this decision.`
          : `Your submission for "${request.questTitle}" was rejected. Reason: ${agentScores.map(s => `${s.agent}: ${(s.score*100).toFixed(0)}%`).join(', ')}. You can appeal this decision.`,
        type: 'quest_rejected',
        related_id: verification?.id || request.submissionId,
        related_type: 'verification',
      });
    } else {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: '⏳ Quest Under Review',
        message: `Your submission for "${request.questTitle}" needs manual review. You can appeal if you disagree.`,
        type: 'quest_review',
        related_id: verification?.id || request.submissionId,
        related_type: 'verification',
      });
    }

    // Cross-reference in background
    if (verification?.id) {
      crossReferenceInBackground(supabase, verification.id, request, userId).catch(console.error);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    verification: {
      id: verification?.id || crypto.randomUUID(),
      quest_match_score: agentScores.find(a => a.agent === 'context')?.score ?? 0.5,
      geolocation_match_score: agentScores.find(a => a.agent === 'geolocation')?.score ?? 0.5,
      authenticity_score: agentScores.find(a => a.agent === 'authenticity')?.score ?? 0.5,
      scene_relevance_score: agentScores.find(a => a.agent === 'scene_relevance')?.score ?? 0.5,
      final_confidence: finalConfidence,
      verdict,
      reason,
      agent_scores: Object.fromEntries(agentScores.map(s => [s.agent, s.score])),
      agent_explanations: explanations,
      execution_time_ms: executionTime,
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ===== INDIVIDUAL AGENTS =====

async function callLovableAI(systemPrompt: string, userPrompt: string, apiKey: string, imageUrl?: string): Promise<any> {
  if (!apiKey) return null;
  
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (imageUrl) {
    // For image analysis, include image URL in user message
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: userPrompt });
  }

  try {
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.1,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Lovable AI error:', resp.status, errText);
      return null;
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse JSON from AI response:', e);
      }
    }
    return { raw: content };
  } catch (e: any) {
    console.error('AI call failed:', e.message);
    return null;
  }
}

async function runContextAgent(request: VerificationRequest, apiKey: string): Promise<AgentScore> {
  const result = await callLovableAI(
    `You are a quest verification context analysis agent. Analyze whether the submitted photo matches the quest requirements. Respond with JSON: { "score": 0.0-1.0, "explanation": "brief reason" }`,
    `Quest: "${request.questTitle}" - ${request.questDescription}\nLocation: ${request.questLocation}\nAnalyze if the photo at this URL matches the quest requirements.`,
    apiKey,
    request.photoUrl
  );

  return {
    agent: 'context',
    score: result?.score ?? 0.5,
    weight: 0.30,
    explanation: result?.explanation ?? 'Context analysis unavailable',
  };
}

function runGeolocationAgent(request: VerificationRequest): AgentScore {
  const { questLatitude, questLongitude, userLatitude, userLongitude } = request;
  
  if (!questLatitude || !questLongitude || !userLatitude || !userLongitude) {
    return {
      agent: 'geolocation',
      score: 0.5,
      weight: 0.25,
      explanation: 'GPS coordinates not available for comparison',
    };
  }

  const R = 6371e3;
  const φ1 = (questLatitude * Math.PI) / 180;
  const φ2 = (userLatitude * Math.PI) / 180;
  const Δφ = ((userLatitude - questLatitude) * Math.PI) / 180;
  const Δλ = ((userLongitude - questLongitude) * Math.PI) / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const maxDist = 500;
  const score = distance <= maxDist ? Math.max(0, 1 - distance / maxDist) : Math.max(0, 0.3 - distance / (maxDist * 10));

  return {
    agent: 'geolocation',
    score,
    weight: 0.25,
    explanation: `${Math.round(distance)}m from quest location (threshold: ${maxDist}m)`,
  };
}

async function runAuthenticityAgent(request: VerificationRequest, apiKey: string): Promise<AgentScore> {
  const result = await callLovableAI(
    `You are a photo authenticity agent. Detect signs of AI generation, stock photos, screenshots, or manipulation. Respond with JSON: { "score": 0.0-1.0 (1.0 = definitely authentic), "explanation": "brief reason" }`,
    `Analyze this photo for authenticity. Check for: AI generation artifacts, stock photo watermarks, screenshot indicators, digital manipulation, consistent lighting/shadows.`,
    apiKey,
    request.photoUrl
  );

  return {
    agent: 'authenticity',
    score: result?.score ?? 0.5,
    weight: 0.25,
    explanation: result?.explanation ?? 'Authenticity analysis unavailable',
  };
}

async function runDeepfakeAgent(request: VerificationRequest, apiKey: string): Promise<AgentScore> {
  const result = await callLovableAI(
    `You are a deepfake and AI-generated image detection specialist. Analyze the photo for signs of being AI-generated, deepfaked, or synthetically created. Look for: unnatural skin textures, inconsistent lighting/shadows, warped backgrounds, irregular eye reflections, blending artifacts, repetitive patterns, unusual noise, overly smooth surfaces.
    
    Respond with JSON: { "score": 0.0-1.0 (1.0 = definitely real/authentic, 0.0 = definitely fake/AI-generated), "explanation": "brief technical analysis of authenticity indicators" }`,
    `Analyze this image for deepfake or AI-generation indicators. Provide a detailed technical assessment of whether this is a genuine photograph or synthetically generated.`,
    apiKey,
    request.photoUrl
  );

  return {
    agent: 'deepfake',
    score: result?.score ?? 0.5,
    weight: 0.15,
    explanation: result?.explanation ?? 'Deepfake analysis unavailable',
  };
}

async function generateAnalysisReport(request: VerificationRequest, apiKey: string, agentScores: AgentScore[]): Promise<string> {
  const scoresContext = agentScores.map(s => `${s.agent}: ${(s.score * 100).toFixed(0)}% - ${s.explanation}`).join('\n');
  
  const result = await callLovableAI(
    `You are a photo forensics analyst producing detailed verification reports for quest submission photos. Generate a comprehensive but concise analysis report.`,
    `Generate a detailed analysis report for this quest submission photo.

Quest: "${request.questTitle}" - ${request.questDescription}
Location: ${request.questLocation}

Agent scores so far:
${scoresContext}

Provide a structured report covering:
1) **Image Authenticity**: Signs of manipulation, AI generation, or editing
2) **Content Relevance**: How well the photo matches the quest requirements
3) **Quality Assessment**: Image quality, resolution, and clarity indicators
4) **Anomalies**: Any suspicious elements, inconsistencies, or red flags
5) **Overall Assessment**: Final summary and recommendation

Keep the report under 300 words.`,
    apiKey,
    request.photoUrl
  );

  return result?.raw || result?.report || 'Analysis report generation failed';
}

async function runSceneRelevanceAgent(request: VerificationRequest, apiKey: string): Promise<AgentScore> {
  const result = await callLovableAI(
    `You are a scene relevance agent. Determine if the photo scene is consistent with the quest location and objectives. Respond with JSON: { "score": 0.0-1.0, "explanation": "brief reason" }`,
    `Quest: "${request.questTitle}" at "${request.questLocation}"\nDescription: ${request.questDescription}\nDoes this photo show a scene consistent with completing this quest?`,
    apiKey,
    request.photoUrl
  );

  return {
    agent: 'scene_relevance',
    score: result?.score ?? 0.5,
    weight: 0.20,
    explanation: result?.explanation ?? 'Scene relevance analysis unavailable',
  };
}

// ===== APPEAL REVIEW =====
async function handleAppealReview(supabase: any, request: AppealRequest, apiKey: string) {
  console.log('📋 Processing appeal review...');

  const thresholds = await getThresholds(supabase);

  // Get original verification
  const { data: verification } = await supabase
    .from('ai_verifications')
    .select('*')
    .eq('id', request.verificationId)
    .single();

  if (!verification) {
    return new Response(JSON.stringify({ error: 'Verification not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // AI appeal review - re-analyze with appeal context
  const result = await callLovableAI(
    `You are an AI appeal review agent. A user is appealing a photo verification decision. 
     Original verdict: ${verification.verdict} (confidence: ${verification.final_confidence})
     Original reason: ${verification.reason}
     
     Re-evaluate considering the user's appeal. Be fair but rigorous.
     Respond with JSON: { "verdict": "uphold"|"overturn"|"escalate", "confidence": 0.0-1.0, "reason": "detailed explanation" }`,
    `Appeal reason: "${request.appealReason}"\nQuest: "${request.questTitle}" - ${request.questDescription}\nRe-analyze this photo considering the appeal.`,
    apiKey,
    request.photoUrl
  );

  const aiVerdict = result?.verdict || 'escalate';
  const aiConfidence = result?.confidence || 0.5;
  const aiReason = result?.reason || 'Appeal review completed';

  // Update appeal record
  const updateData: any = {
    ai_review_result: result,
    ai_review_verdict: aiVerdict,
    ai_review_confidence: aiConfidence,
    ai_review_reason: aiReason,
    appeal_status: 'reviewing',
    reviewed_at: new Date().toISOString(),
  };

  // Auto-resolve if AI is very confident
  if (aiVerdict === 'overturn' && aiConfidence >= thresholds.appeal_auto_approve_confidence) {
    updateData.appeal_status = 'approved';
    updateData.resolved_at = new Date().toISOString();
    
    // Update original verification
    await supabase.from('ai_verifications').update({
      verdict: 'verified',
      verification_stage: 'appeal_overturned',
      appeal_count: (verification.appeal_count || 0) + 1,
    }).eq('id', request.verificationId);

    // Approve submission
    await supabase.from('Submissions').update({ status: 'approved' }).eq('id', verification.submission_id);
  } else if (aiVerdict === 'uphold' && aiConfidence >= 0.9) {
    updateData.appeal_status = 'denied';
    updateData.resolved_at = new Date().toISOString();
  }
  // Otherwise stays as 'reviewing' for admin

  await supabase.from('verification_appeals').update(updateData).eq('id', request.appealId);

  return new Response(JSON.stringify({
    success: true,
    appeal: {
      verdict: aiVerdict,
      confidence: aiConfidence,
      reason: aiReason,
      auto_resolved: updateData.appeal_status !== 'reviewing',
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ===== CROSS-REFERENCE =====
async function crossReferenceInBackground(
  supabase: any,
  verificationId: string,
  request: VerificationRequest,
  userId: string
) {
  try {
    // Get recent verifications from same user
    const { data: userVerifications } = await supabase
      .from('ai_verifications')
      .select('id, photo_url, quest_match_score, final_confidence, verdict, submission_id')
      .eq('user_id', userId)
      .neq('id', verificationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!userVerifications?.length) return;

    const thresholds = await getThresholds(supabase);
    let flagCount = 0;

    for (const prev of userVerifications) {
      // Pattern check: rapid submissions with similar scores
      const scoreDiff = Math.abs((prev.final_confidence || 0.5) - 0.5);
      if (scoreDiff < 0.1) {
        // User consistently gets borderline scores
        await supabase.from('verification_cross_references').insert({
          source_verification_id: verificationId,
          target_verification_id: prev.id,
          similarity_score: 0.7,
          similarity_type: 'user_pattern',
          flagged: true,
          flag_reason: 'Consistently borderline confidence scores',
        });
        flagCount++;
      }
    }

    // Update flag count
    if (flagCount > 0) {
      await supabase.from('ai_verifications')
        .update({ cross_reference_flags: flagCount })
        .eq('id', verificationId);
    }
  } catch (e) {
    console.error('Cross-reference error:', e);
  }
}

async function handleCrossReference(supabase: any, verificationId: string, apiKey: string) {
  // Manual cross-reference trigger
  const { data: verification } = await supabase
    .from('ai_verifications')
    .select('*')
    .eq('id', verificationId)
    .single();

  if (!verification) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: recentVerifications } = await supabase
    .from('ai_verifications')
    .select('id, photo_url, user_id, final_confidence, verdict')
    .neq('id', verificationId)
    .order('created_at', { ascending: false })
    .limit(20);

  const crossRefs: any[] = [];

  // Check for same-user pattern
  const sameUserVerifs = (recentVerifications || []).filter((v: any) => v.user_id === verification.user_id);
  if (sameUserVerifs.length > 0) {
    const avgConfidence = sameUserVerifs.reduce((sum: number, v: any) => sum + (v.final_confidence || 0), 0) / sameUserVerifs.length;
    crossRefs.push({
      type: 'user_pattern',
      count: sameUserVerifs.length,
      avg_confidence: avgConfidence,
      flagged: sameUserVerifs.filter((v: any) => v.verdict === 'rejected').length > 2,
    });
  }

  return new Response(JSON.stringify({
    success: true,
    cross_references: crossRefs,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ===== FEEDBACK LOOP =====
async function handleApplyFeedback(
  supabase: any,
  verificationId: string,
  correctedVerdict: string,
  adminId: string,
  notes: string
) {
  console.log('📊 Applying feedback to thresholds...');

  const { data: verification } = await supabase
    .from('ai_verifications')
    .select('*')
    .eq('id', verificationId)
    .single();

  if (!verification) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Record feedback
  await supabase.from('verification_feedback').insert({
    verification_id: verificationId,
    admin_id: adminId,
    original_verdict: verification.verdict,
    corrected_verdict: correctedVerdict,
    original_confidence: verification.final_confidence,
    feedback_notes: notes,
    score_adjustments: {
      original_scores: verification.agent_scores,
      confidence_at_correction: verification.final_confidence,
    },
  });

  // Adjust thresholds based on feedback pattern
  const { data: recentFeedback } = await supabase
    .from('verification_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (recentFeedback && recentFeedback.length >= 5) {
    // Calculate how often AI was wrong
    const wrongVerdicts = recentFeedback.filter(
      (f: any) => f.original_verdict !== f.corrected_verdict
    );
    const errorRate = wrongVerdicts.length / recentFeedback.length;

    // If error rate is high, widen the uncertain band
    if (errorRate > 0.3) {
      // Too many false positives/negatives - adjust thresholds
      const falsePositives = wrongVerdicts.filter((f: any) => f.original_verdict === 'verified');
      const falseNegatives = wrongVerdicts.filter((f: any) => f.original_verdict === 'rejected');

      if (falsePositives.length > falseNegatives.length) {
        // Raise verify threshold
        const { data: current } = await supabase
          .from('verification_thresholds')
          .select('threshold_value, adjustment_history, sample_count')
          .eq('threshold_key', 'verify_min_confidence')
          .single();
        
        if (current) {
          const newVal = Math.min(0.95, parseFloat(current.threshold_value) + 0.02);
          const history = current.adjustment_history || [];
          history.push({ date: new Date().toISOString(), from: current.threshold_value, to: newVal, reason: 'false_positive_correction' });
          
          await supabase.from('verification_thresholds')
            .update({ 
              threshold_value: newVal, 
              sample_count: (current.sample_count || 0) + 1,
              adjustment_history: history,
              last_adjusted_at: new Date().toISOString()
            })
            .eq('threshold_key', 'verify_min_confidence');
        }
      }

      if (falseNegatives.length > falsePositives.length) {
        // Lower reject threshold
        const { data: current } = await supabase
          .from('verification_thresholds')
          .select('threshold_value, adjustment_history, sample_count')
          .eq('threshold_key', 'reject_max_confidence')
          .single();
        
        if (current) {
          const newVal = Math.max(0.1, parseFloat(current.threshold_value) - 0.02);
          const history = current.adjustment_history || [];
          history.push({ date: new Date().toISOString(), from: current.threshold_value, to: newVal, reason: 'false_negative_correction' });
          
          await supabase.from('verification_thresholds')
            .update({ 
              threshold_value: newVal,
              sample_count: (current.sample_count || 0) + 1,
              adjustment_history: history,
              last_adjusted_at: new Date().toISOString()
            })
            .eq('threshold_key', 'reject_max_confidence');
        }
      }
    }
  }

  // Mark verification as having feedback applied
  await supabase.from('ai_verifications')
    .update({ 
      feedback_applied: true,
      verdict: correctedVerdict,
      admin_override: true,
      admin_override_reason: notes,
      verification_stage: 'feedback_applied'
    })
    .eq('id', verificationId);

  // Update submission
  const newStatus = correctedVerdict === 'verified' ? 'approved' : 'rejected';
  await supabase.from('Submissions')
    .update({ status: newStatus })
    .eq('id', verification.submission_id);

  // Send notification to the user about the admin decision
  const submissionData = await supabase.from('Submissions').select('quest_title').eq('id', verification.submission_id).single();
  const questTitle = submissionData?.data?.quest_title || 'Quest';

  if (correctedVerdict === 'rejected') {
    await supabase.from('notifications').insert({
      user_id: verification.user_id,
      title: '❌ Quest Submission Rejected',
      message: `Your submission for "${questTitle}" has been rejected by an admin. Reason: ${notes}. You can appeal this decision.`,
      type: 'quest_rejected',
      related_id: verificationId,
      related_type: 'verification',
    });
  } else if (correctedVerdict === 'verified') {
    await supabase.from('notifications').insert({
      user_id: verification.user_id,
      title: '✅ Quest Submission Approved',
      message: `Your submission for "${questTitle}" has been approved by an admin.`,
      type: 'quest_approved',
      related_id: verification.submission_id,
      related_type: 'submission',
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Feedback applied and thresholds adjusted',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
