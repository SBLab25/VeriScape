// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Flag, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Report {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

export const ContentReportsPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reportId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', reportId);
      if (error) throw error;
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      toast({ title: 'Report Updated', description: `Report marked as ${status}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'reviewed': return <Badge className="gap-1 bg-blue-500"><CheckCircle className="h-3 w-3" />Reviewed</Badge>;
      case 'resolved': return <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Resolved</Badge>;
      case 'dismissed': return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" />Dismissed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      spam: 'Spam / Misleading',
      harassment: 'Harassment',
      inappropriate: 'Inappropriate',
      misinformation: 'Misinformation',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  if (loading) return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-destructive" />
          <div>
            <CardTitle>Content Reports</CardTitle>
            <CardDescription>{reports.filter(r => r.status === 'pending').length} pending reports</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No reports yet</p>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{report.content_type}</Badge>
                    <Badge variant="secondary">{getReasonLabel(report.reason)}</Badge>
                  </div>
                  {getStatusBadge(report.status)}
                </div>
                {report.description && (
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString()} • ID: {report.content_id.slice(0, 8)}
                  </span>
                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(report.id, 'resolved')}>
                        Resolve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(report.id, 'dismissed')}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
