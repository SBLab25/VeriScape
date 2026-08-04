// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/utils/edgeFunctionClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Brain, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Shield,
  Bot, Sparkles, Image, Gavel, GitCompare, SlidersHorizontal,
  MessageSquare, TrendingUp, ArrowRightLeft, Eye, ScanEye, FileText
} from 'lucide-react';

interface AIVerification {
  id: string;
  user_id: string;
  submission_id: string;
  photo_url: string;
  quest_match_score: number;
  geolocation_match_score: number;
  authenticity_score: number;
  scene_relevance_score: number;
  final_confidence: number;
  verdict: 'verified' | 'uncertain' | 'rejected';
  reason: string;
  model_used: string;
  admin_override: boolean;
  admin_override_reason: string | null;
  agent_scores: Record<string, number>;
  agent_explanations: Array<{ agent: string; score: number; weight: number; explanation: string }>;
  verification_stage: string;
  appeal_count: number;
  cross_reference_flags: number;
  feedback_applied: boolean;
  verified_at: string;
  deepfake_verdict?: string | null;
  deepfake_confidence?: number | null;
  analysis_report?: string | null;
  profiles?: { username: string; full_name: string };
}

interface Appeal {
  id: string;
  verification_id: string;
  submission_id: string;
  user_id: string;
  appeal_reason: string;
  appeal_status: string;
  ai_review_verdict: string | null;
  ai_review_confidence: number | null;
  ai_review_reason: string | null;
  admin_decision: string | null;
  admin_reason: string | null;
  created_at: string;
  resolved_at: string | null;
  profiles?: { username: string; full_name: string };
}

interface Threshold {
  id: string;
  threshold_key: string;
  threshold_value: number;
  sample_count: number;
  last_adjusted_at: string;
  adjustment_history: any[];
}

interface Feedback {
  id: string;
  verification_id: string;
  admin_id: string;
  original_verdict: string;
  corrected_verdict: string;
  original_confidence: number;
  feedback_notes: string;
  created_at: string;
}

export const AIVerificationLogs: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<AIVerification[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [feedbackLog, setFeedbackLog] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<AIVerification | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [appealDecisionReason, setAppealDecisionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('verifications');

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [verifRes, appealsRes, thresholdsRes, feedbackRes, submissionsRes] = await Promise.all([
        supabase.from('ai_verifications').select('*').order('verified_at', { ascending: false }).limit(200),
        supabase.from('verification_appeals').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('verification_thresholds').select('*'),
        supabase.from('verification_feedback').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('Submissions').select('*').order('submitted_at', { ascending: false }).limit(200),
      ]);

      const verifications = verifRes.data || [];
      const appeals = appealsRes.data || [];
      const thresholdsData = thresholdsRes.data || [];
      const feedbackData = feedbackRes.data || [];
      const allSubmissions = submissionsRes.data || [];

      // Fetch profiles from the old project (where auth lives)
      const userIds = [...new Set([
        ...verifications.map((v: any) => v.user_id),
        ...appeals.map((a: any) => a.user_id),
        ...allSubmissions.map((s: any) => s.user_id),
      ])];

      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, username, full_name').in('id', userIds);
        if (profiles) {
          for (const p of profiles) profilesMap[p.id] = p;
        }
      }

      // Build submissions map for quest name lookup
      const submissionsMap: Record<string, any> = {};
      for (const s of allSubmissions) submissionsMap[s.id] = s;

      // Fetch quest titles from quests table for submissions that have quest_id but no quest_title
      const questIds = [...new Set(
        allSubmissions
          .filter((s: any) => s.quest_id && !s.quest_title)
          .map((s: any) => s.quest_id)
      )];

      let questsMap: Record<string, string> = {};
      if (questIds.length > 0) {
        const { data: questRows, error: questErr } = await (supabase as any)
          .from('Quests')
          .select('id, title')
          .in('id', questIds);

        if (questErr) {
          throw questErr;
        }

        if (questRows) {
          for (const q of questRows) questsMap[q.id] = q.title;
        }
      }

      setSubmissions(allSubmissions.map((s: any) => ({ ...s, profiles: profilesMap[s.user_id] })));
      setVerifications(verifications.map((v: any) => {
        const submission = submissionsMap[v.submission_id];
        const questTitle = submission?.quest_title || (submission?.quest_id ? questsMap[submission.quest_id] : null);
        return {
          ...v,
          profiles: profilesMap[v.user_id],
          quest_title: questTitle || null,
          submitted_at: submission?.submitted_at || null,
        };
      }));
      setAppeals(appeals.map((a: any) => ({ ...a, profiles: profilesMap[a.user_id] })));
      setThresholds(thresholdsData as any);
      setFeedbackLog(feedbackData as any);
    } catch (error) {
      console.error('Fetch error:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ===== OVERRIDE WITH FEEDBACK LOOP =====
  const handleAdminOverride = async (verificationId: string, newVerdict: 'verified' | 'rejected') => {
    if (!overrideReason.trim()) {
      toast({ title: 'Missing Reason', description: 'Please provide a reason', variant: 'destructive' });
      return;
    }

    setProcessingId(verificationId);
    try {
      // Use the feedback loop endpoint
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const { data, error } = await invokeEdgeFunction('ai-verification-agent', {
          action: 'apply_feedback',
          verificationId,
          correctedVerdict: newVerdict,
          adminId: user?.id,
          notes: overrideReason,
      }, token);

      if (error) throw error;

      toast({ title: 'Feedback Applied', description: `Verdict updated to ${newVerdict}. Thresholds adjusted.` });
      setShowOverrideDialog(false);
      setOverrideReason('');
      setSelectedVerification(null);
      fetchAllData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to apply feedback', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  // ===== APPEAL HANDLING =====
  const triggerAppealReview = async (appeal: Appeal) => {
    setProcessingId(appeal.id);
    try {
      const verification = verifications.find(v => v.id === appeal.verification_id);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const { data, error } = await invokeEdgeFunction('ai-verification-agent', {
          action: 'appeal_review',
          appealId: appeal.id,
          verificationId: appeal.verification_id,
          appealReason: appeal.appeal_reason,
          photoUrl: verification?.photo_url || '',
          questTitle: 'Quest',
          questDescription: '',
      }, token);

      if (error) throw error;
      toast({ title: 'Appeal Reviewed', description: `AI verdict: ${data.appeal?.verdict}` });
      fetchAllData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Appeal review failed', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const resolveAppeal = async (appealId: string, decision: 'approved' | 'denied') => {
    if (!appealDecisionReason.trim()) {
      toast({ title: 'Missing Reason', description: 'Please provide a reason', variant: 'destructive' });
      return;
    }

    try {
      const appeal = appeals.find(a => a.id === appealId);
      await supabase.from('verification_appeals' as any).update({
        admin_decision: decision,
        admin_reason: appealDecisionReason,
        appeal_status: decision,
        resolved_at: new Date().toISOString(),
        admin_id: user?.id,
      }).eq('id', appealId);

      if (decision === 'approved' && appeal) {
        await supabase.from('ai_verifications' as any).update({
          verdict: 'verified',
          admin_override: true,
          admin_override_reason: appealDecisionReason,
          verification_stage: 'appeal_approved',
        }).eq('id', appeal.verification_id);
        await supabase.from('Submissions').update({ status: 'approved' }).eq('id', appeal.submission_id);
      }

      toast({ title: 'Appeal Resolved', description: `Appeal ${decision}` });
      setAppealDecisionReason('');
      fetchAllData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // ===== THRESHOLD UPDATE =====
  const updateThreshold = async (key: string, newValue: number) => {
    // Optimistic update
    setThresholds(prev => prev.map(t => 
      t.threshold_key === key ? { ...t, threshold_value: newValue, last_adjusted_at: new Date().toISOString() } : t
    ));
    try {
      const { data, error } = await supabase
        .from('verification_thresholds')
        .update({ threshold_value: newValue, last_adjusted_at: new Date().toISOString() })
        .eq('threshold_key', key)
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Threshold Updated', description: `${key.replace(/_/g, ' ')} set to ${(newValue * 100).toFixed(1)}%` });
    } catch (error: any) {
      console.error('Threshold update error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update threshold', variant: 'destructive' });
      // Revert on error
      fetchAllData();
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'verified': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'uncertain': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'verified': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'uncertain': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const pendingAppeals = appeals.filter(a => a.appeal_status === 'pending' || a.appeal_status === 'reviewing');

  return (
    <div className="space-y-6">
      {/* Summary Stats - Futuristic Grid */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary/80">AI Scans</CardTitle>
            <Brain className="h-4 w-4 text-primary animate-pulse" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black tracking-tight">{verifications.length}</div></CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400">Verified</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black tracking-tight text-emerald-400">{verifications.filter(v => v.verdict === 'verified').length}</div></CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-400">Uncertain</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black tracking-tight text-amber-400">{verifications.filter(v => v.verdict === 'uncertain').length}</div></CardContent>
        </Card>
        <Card className="border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-rose-500/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-rose-400">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black tracking-tight text-rose-400">{verifications.filter(v => v.verdict === 'rejected').length}</div></CardContent>
        </Card>
        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-500/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-400">Pending Appeals</CardTitle>
            <Gavel className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black tracking-tight text-orange-400">{pendingAppeals.length}</div></CardContent>
        </Card>
      </div>

      {/* Main Tabs - Futuristic */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-background/50 backdrop-blur border border-primary/20">
          <TabsTrigger value="verifications" className="flex items-center gap-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><Brain className="h-3 w-3" />Verifications</TabsTrigger>
          <TabsTrigger value="appeals" className="flex items-center gap-1 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
            <Gavel className="h-3 w-3" />Appeals
            {pendingAppeals.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1 text-xs animate-pulse">{pendingAppeals.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="flex items-center gap-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><SlidersHorizontal className="h-3 w-3" />Thresholds</TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-1 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"><TrendingUp className="h-3 w-3" />Feedback</TabsTrigger>
        </TabsList>

        {/* ===== VERIFICATIONS TAB ===== */}
        <TabsContent value="verifications">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Multi-Agent Verification History</CardTitle>
                  <CardDescription>Enhanced verification with agent-level scoring and explanations</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAllData}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Quest Name</TableHead>
                    <TableHead>Verdict</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Agent Scores</TableHead>
                    <TableHead>Deepfake</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="font-medium">{v.profiles?.username || 'Unknown'}</div>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {(v as any).quest_title || v.submission_id?.slice(0, 8) || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getVerdictIcon(v.verdict)}
                          <span className="capitalize">{v.verdict}</span>
                          {v.admin_override && <Badge variant="outline" className="ml-1"><Shield className="h-3 w-3 mr-1" />Override</Badge>}
                          {v.feedback_applied && <Badge variant="outline" className="ml-1 border-blue-500/20 text-blue-500"><TrendingUp className="h-3 w-3 mr-1" />Learned</Badge>}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="ml-1 h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                            title="Re-evaluate"
                            disabled={processingId === v.id}
                            onClick={async () => {
                              setProcessingId(v.id);
                              try {
                                // Fetch submission + quest directly
                                const { data: submission } = await supabase
                                  .from('Submissions')
                                  .select('*')
                                  .eq('id', v.submission_id)
                                  .single();
                                let quest = null;
                                if (submission?.quest_id) {
                                  const { data: questData, error: questError } = await (supabase as any)
                                    .from('Quests')
                                    .select('*')
                                    .eq('id', submission.quest_id)
                                    .maybeSingle();
                                  if (questError) {
                                    throw questError;
                                  }
                                  quest = questData;
                                }

                                // Delete the old verification so the re-evaluation replaces it
                                await supabase.from('ai_verifications').delete().eq('id', v.id);

                                const { data: sessionData } = await supabase.auth.getSession();
                                const token = sessionData?.session?.access_token;
                                const { data, error } = await invokeEdgeFunction('ai-verification-agent', {
                                  action: 'verify',
                                  submissionId: v.submission_id,
                                  userId: v.user_id,
                                  photoUrl: v.photo_url || submission.photo_url,
                                  questTitle: quest?.title || submission?.quest_title || (v as any).quest_title || 'Quest',
                                  questDescription: quest?.description || submission?.description || '',
                                  questLocation: quest?.location || submission?.geo_location || '',
                                }, token);
                                if (error) throw error;
                                toast({ title: 'Re-evaluation Complete', description: `New verdict: ${data?.verification?.verdict || 'unknown'}` });
                                fetchAllData();
                              } catch (err: any) {
                                toast({ title: 'Re-evaluation Failed', description: err.message || 'Error', variant: 'destructive' });
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                          >
                            <RefreshCw className={`h-3 w-3 ${processingId === v.id ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getVerdictColor(v.verdict)}>{Math.round(v.final_confidence * 100)}%</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {v.agent_explanations && Array.isArray(v.agent_explanations) ? (
                            v.agent_explanations.map((ae: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {ae.agent}: {Math.round((ae.score || 0) * 100)}%
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Legacy</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {v.deepfake_verdict ? (
                          <Badge className={v.deepfake_verdict === 'REAL' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}>
                            <ScanEye className="h-3 w-3 mr-1" />
                            {v.deepfake_verdict}
                            {v.deepfake_confidence != null && ` ${Math.round(v.deepfake_confidence * 100)}%`}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{v.verification_stage || 'initial'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {(v as any).submitted_at ? new Date((v as any).submitted_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {v.verified_at ? new Date(v.verified_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Detail View */}
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedVerification(v); setShowDetailDialog(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Photo View */}
                          {v.photo_url && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost"><Image className="h-4 w-4" /></Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Submission Photo</DialogTitle></DialogHeader>
                                <img src={v.photo_url} alt="Submission" className="max-w-full max-h-[70vh] object-contain rounded-lg border mx-auto" />
                              </DialogContent>
                            </Dialog>
                          )}
                          {/* Override */}
                          <Button size="sm" variant="outline" onClick={() => { setSelectedVerification(v); setShowOverrideDialog(true); }}>
                            <Shield className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== APPEALS TAB ===== */}
        <TabsContent value="appeals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5" />Verification Appeals</CardTitle>
              <CardDescription>AI-reviewed appeals with admin escalation</CardDescription>
            </CardHeader>
            <CardContent>
              {appeals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No appeals submitted yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>AI Review</TableHead>
                      <TableHead>Admin Decision</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appeals.map((appeal) => (
                      <TableRow key={appeal.id}>
                        <TableCell className="font-medium">{appeal.profiles?.username || 'Unknown'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{appeal.appeal_reason}</TableCell>
                        <TableCell>
                          <Badge className={
                            appeal.appeal_status === 'approved' ? 'bg-green-500/10 text-green-500' :
                            appeal.appeal_status === 'denied' ? 'bg-red-500/10 text-red-500' :
                            appeal.appeal_status === 'reviewing' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }>
                            {appeal.appeal_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {appeal.ai_review_verdict ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="capitalize">{appeal.ai_review_verdict}</Badge>
                              {appeal.ai_review_confidence !== null && (
                                <div className="text-xs text-muted-foreground">{Math.round(appeal.ai_review_confidence * 100)}% confident</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not reviewed</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {appeal.admin_decision ? (
                            <Badge className={appeal.admin_decision === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                              {appeal.admin_decision}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">{new Date(appeal.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!appeal.ai_review_verdict && (
                              <Button size="sm" variant="outline" disabled={processingId === appeal.id}
                                onClick={() => triggerAppealReview(appeal)}>
                                <Bot className="h-4 w-4 mr-1" />{processingId === appeal.id ? '...' : 'AI Review'}
                              </Button>
                            )}
                            {!appeal.admin_decision && appeal.appeal_status !== 'approved' && appeal.appeal_status !== 'denied' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline"><Gavel className="h-4 w-4 mr-1" />Decide</Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Resolve Appeal</DialogTitle>
                                    <DialogDescription>User's reason: {appeal.appeal_reason}</DialogDescription>
                                  </DialogHeader>
                                  {appeal.ai_review_reason && (
                                    <div className="bg-muted p-3 rounded-lg text-sm">
                                      <p className="font-medium mb-1">AI Review:</p>
                                      <p>{appeal.ai_review_reason}</p>
                                    </div>
                                  )}
                                  <Textarea placeholder="Reason for decision..." value={appealDecisionReason}
                                    onChange={(e) => setAppealDecisionReason(e.target.value)} />
                                  <div className="flex gap-2">
                                    <Button className="flex-1" onClick={() => resolveAppeal(appeal.id, 'approved')}>Approve</Button>
                                    <Button variant="destructive" className="flex-1" onClick={() => resolveAppeal(appeal.id, 'denied')}>Deny</Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== THRESHOLDS TAB ===== */}
        <TabsContent value="thresholds">
          <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400"><SlidersHorizontal className="h-5 w-5" />Adaptive Thresholds</CardTitle>
              <CardDescription>Auto-adjusted from admin feedback. Manual override available.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {thresholds.map((t) => (
                <div key={t.id} className="space-y-3 p-4 rounded-lg border border-cyan-500/10 bg-cyan-500/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold capitalize text-foreground">{t.threshold_key.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">Samples: {t.sample_count} | Last adjusted: {t.last_adjusted_at ? new Date(t.last_adjusted_at).toLocaleDateString() : 'Never'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black tracking-tight text-cyan-400">{(t.threshold_value * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <Progress value={t.threshold_value * 100} className="h-2.5" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => updateThreshold(t.threshold_key, Math.max(0, t.threshold_value - 0.05))}>-5%</Button>
                    <Button size="sm" variant="outline" className="border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => updateThreshold(t.threshold_key, Math.min(1, t.threshold_value + 0.05))}>+5%</Button>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="Custom %"
                      className="w-28 h-8 text-sm border-cyan-500/30"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseFloat((e.target as HTMLInputElement).value);
                          if (!isNaN(val) && val >= 0 && val <= 100) {
                            updateThreshold(t.threshold_key, val / 100);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                  {Array.isArray(t.adjustment_history) && t.adjustment_history.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1 mt-2 pl-2 border-l-2 border-cyan-500/20">
                      <p className="font-medium">Recent adjustments:</p>
                      {t.adjustment_history.slice(-3).map((h: any, i: number) => (
                        <p key={i}>{new Date(h.date).toLocaleDateString()}: {(h.from * 100).toFixed(1)}% → {(h.to * 100).toFixed(1)}% ({h.reason})</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== FEEDBACK TAB ===== */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Feedback Loop</CardTitle>
              <CardDescription>Admin corrections that train the adaptive thresholds</CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackLog.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No feedback recorded yet. Override verifications to start training.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original</TableHead>
                      <TableHead>Corrected</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbackLog.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getVerdictIcon(f.original_verdict)}
                            <span className="capitalize">{f.original_verdict}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                            {getVerdictIcon(f.corrected_verdict)}
                            <span className="capitalize">{f.corrected_verdict}</span>
                          </div>
                        </TableCell>
                        <TableCell>{f.original_confidence ? `${Math.round(f.original_confidence * 100)}%` : '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{f.feedback_notes || '-'}</TableCell>
                        <TableCell className="text-sm">{new Date(f.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DETAIL DIALOG ===== */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
            <DialogDescription>Multi-agent analysis breakdown</DialogDescription>
          </DialogHeader>
          {selectedVerification && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {getVerdictIcon(selectedVerification.verdict)}
                <span className="text-lg font-bold capitalize">{selectedVerification.verdict}</span>
                <Badge className={getVerdictColor(selectedVerification.verdict)}>
                  {Math.round(selectedVerification.final_confidence * 100)}% confidence
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="font-medium">Agent Breakdown:</p>
                {selectedVerification.agent_explanations && Array.isArray(selectedVerification.agent_explanations) ? (
                  selectedVerification.agent_explanations.map((ae: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{ae.agent} Agent</span>
                        <Badge variant="outline">{Math.round((ae.score || 0) * 100)}% (weight: {ae.weight})</Badge>
                      </div>
                      <Progress value={(ae.score || 0) * 100} className="h-2" />
                      <p className="text-sm text-muted-foreground">{ae.explanation}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Legacy verification - no agent breakdown available</p>
                )}
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium mb-1">Full Reason:</p>
                <p className="text-sm">{selectedVerification.reason}</p>
              </div>

              {selectedVerification.cross_reference_flags > 0 && (
                <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <p className="font-medium text-red-500 mb-1">⚠️ Cross-Reference Flags: {selectedVerification.cross_reference_flags}</p>
                  <p className="text-sm text-muted-foreground">Suspicious patterns detected with other submissions</p>
                </div>
              )}

              {/* Deepfake Result */}
              {selectedVerification.deepfake_verdict && (
                <div className={`p-3 rounded-lg border ${selectedVerification.deepfake_verdict === 'REAL' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <p className="font-medium flex items-center gap-2">
                    <ScanEye className="h-4 w-4" />
                    Deepfake Detection: {selectedVerification.deepfake_verdict}
                    {selectedVerification.deepfake_confidence != null && ` (${Math.round(selectedVerification.deepfake_confidence * 100)}% confidence)`}
                  </p>
                </div>
              )}

              {/* Analysis Report */}
              {selectedVerification.analysis_report && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="font-medium flex items-center gap-2"><FileText className="h-4 w-4" />Analysis Report</p>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedVerification.analysis_report}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== OVERRIDE DIALOG (with feedback) ===== */}
      <Dialog open={showOverrideDialog} onOpenChange={(open) => { setShowOverrideDialog(open); if (!open) { setSelectedVerification(null); setOverrideReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Override with Feedback</DialogTitle>
            <DialogDescription>
              Your correction will adjust adaptive thresholds for future verifications.
              Current verdict: <strong className="capitalize">{selectedVerification?.verdict}</strong> ({selectedVerification ? Math.round(selectedVerification.final_confidence * 100) : 0}%)
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Explain why you're overriding and what was wrong..."
            value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
          <div className="flex gap-2">
            <Button className="flex-1" disabled={processingId === selectedVerification?.id}
              onClick={() => selectedVerification && handleAdminOverride(selectedVerification.id, 'verified')}>
              ✅ Approve (Train: lower bar)
            </Button>
            <Button variant="destructive" className="flex-1" disabled={processingId === selectedVerification?.id}
              onClick={() => selectedVerification && handleAdminOverride(selectedVerification.id, 'rejected')}>
              ❌ Reject (Train: raise bar)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
