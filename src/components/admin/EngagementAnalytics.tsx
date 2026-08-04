// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Activity, TrendingUp, Trophy, Target, Zap, Clock, BarChart3,
  CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart
} from 'recharts';

interface Stats {
  totalUsers: number;
  totalQuests: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  pendingSubmissions: number;
  completionRate: number;
  questsByType: { name: string; count: number }[];
  questsByDifficulty: { name: string; count: number }[];
  userActivity: { date: string; signups: number; submissions: number }[];
  topPerformers: { username: string; score: number }[];
  avgQuestsPerUser: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'];

export const EngagementAnalytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [profilesRes, questsRes, submissionsRes, statsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, created_at, score'),
        supabase.from('Quests').select('id, quest_type, difficulty, created_at, is_active'),
        supabase.from('Submissions').select('id, status, submitted_at, quest_id, user_id'),
        supabase.from('user_quest_stats').select('user_id, total_completed, total_xp, current_level'),
      ]);

      const profiles = profilesRes.data || [];
      const quests = questsRes.data || [];
      const submissions = submissionsRes.data || [];
      const questStats = statsRes.data || [];

      // Quest type distribution
      const typeCount: Record<string, number> = {};
      quests.forEach(q => { typeCount[q.quest_type] = (typeCount[q.quest_type] || 0) + 1; });
      const questsByType = Object.entries(typeCount).map(([name, count]) => ({ name, count }));

      // Difficulty distribution
      const diffNames: Record<number, string> = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' };
      const diffCount: Record<string, number> = {};
      quests.forEach(q => {
        const label = diffNames[q.difficulty] || `${q.difficulty}`;
        diffCount[label] = (diffCount[label] || 0) + 1;
      });
      const questsByDifficulty = Object.entries(diffCount).map(([name, count]) => ({ name, count }));

      // Submission stats
      const approved = submissions.filter(s => s.status === 'verified' || s.status === 'approved').length;
      const rejected = submissions.filter(s => s.status === 'rejected').length;
      const pending = submissions.filter(s => s.status === 'pending').length;

      // User activity over last 30 days
      const now = new Date();
      const userActivity = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const signups = profiles.filter(p => p.created_at?.startsWith(dateStr)).length;
        const subs = submissions.filter(s => s.submitted_at?.startsWith(dateStr)).length;
        userActivity.push({ date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }), signups, submissions: subs });
      }

      // Top performers
      const topPerformers = profiles
        .filter(p => p.score && p.score > 0)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5)
        .map(p => ({ username: p.username || 'Anonymous', score: p.score || 0 }));

      // Avg quests per active user
      const uniqueSubmitters = new Set(submissions.map(s => s.user_id)).size;
      const avgQuestsPerUser = uniqueSubmitters > 0 ? Math.round((submissions.length / uniqueSubmitters) * 10) / 10 : 0;

      setStats({
        totalUsers: profiles.length,
        totalQuests: quests.length,
        totalSubmissions: submissions.length,
        approvedSubmissions: approved,
        rejectedSubmissions: rejected,
        pendingSubmissions: pending,
        completionRate: submissions.length > 0 ? Math.round((approved / submissions.length) * 100) : 0,
        questsByType,
        questsByDifficulty,
        userActivity,
        topPerformers,
        avgQuestsPerUser,
      });
    } catch (err) {
      console.error('Error fetching engagement stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Quests</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalQuests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completionRate}%</div>
            <Progress value={stats.completionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quests/User</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgQuestsPerUser}</div>
          </CardContent>
        </Card>
      </div>

      {/* Submission Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Pipeline</CardTitle>
          <CardDescription>Current status of all quest submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{stats.pendingSubmissions}</div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.approvedSubmissions}</div>
                <div className="text-sm text-muted-foreground">Approved</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{stats.rejectedSubmissions}</div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.userActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="submissions" fill="hsl(var(--primary))" fillOpacity={0.2} stroke="hsl(var(--primary))" strokeWidth={2} />
                <Area type="monotone" dataKey="signups" fill="hsl(var(--secondary))" fillOpacity={0.2} stroke="hsl(var(--secondary))" strokeWidth={2} />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quest Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quest Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.questsByType} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {stats.questsByType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Difficulty Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.questsByDifficulty}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topPerformers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                stats.topPerformers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                      <span className="font-medium">{p.username}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">{p.score.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
