import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Database, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { invokeEdgeFunction } from '@/utils/edgeFunctionClient';

export const DatabaseExport = () => {
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<{ tableCount: number; totalRows: number } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleExport = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
      return;
    }

    setExporting(true);
    try {
      const { data: exportData, error } = await invokeEdgeFunction('export-database', {
        user_id: user.id,
      });

      if (error) throw new Error(error.message || 'Export failed');

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const totalRows = Object.values(exportData.row_counts as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
      setLastExport({ tableCount: exportData.table_count, totalRows });

      toast({
        title: 'Export Complete',
        description: `Exported ${exportData.table_count} tables with ${totalRows} total rows.`,
      });

      if (exportData.errors?.length) {
        toast({
          title: 'Some tables had errors',
          description: exportData.errors.join(', '),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Export
        </CardTitle>
        <CardDescription>
          Export all database tables as a JSON file for migration to another database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This will export all tables including: Submissions, Quests, AI Verifications, Notifications,
          User Roles, Quest Chains, Social Groups, and more.
        </p>

        {lastExport && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <CheckCircle className="h-4 w-4" />
            Last export: {lastExport.tableCount} tables, {lastExport.totalRows} rows
          </div>
        )}

        <Button onClick={handleExport} disabled={exporting} className="w-full sm:w-auto">
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export All Tables as JSON
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
