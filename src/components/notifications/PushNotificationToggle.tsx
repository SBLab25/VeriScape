import React from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useWebPush } from '@/hooks/useWebPush';

export const PushNotificationToggle = () => {
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } = useWebPush();

  if (!isSupported) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <BellOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Push Notifications</CardTitle>
              <CardDescription className="text-sm">
                Your browser doesn't support push notifications.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`border transition-all duration-300 ${isSubscribed ? 'border-primary/30 bg-primary/5' : 'border-muted'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${isSubscribed ? 'bg-primary/10' : 'bg-muted'}`}>
              {isSubscribed ? (
                <BellRing className="h-5 w-5 text-primary" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Push Notifications</CardTitle>
                {isSubscribed && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    Active
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm">
                {isSubscribed
                  ? 'Receive alerts even when VeriScape is closed.'
                  : 'Get notified about quests, badges, and updates.'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Switch
                checked={isSubscribed}
                onCheckedChange={(checked) => {
                  if (checked) subscribe();
                  else unsubscribe();
                }}
              />
            )}
          </div>
        </div>
      </CardHeader>
      {permission === 'denied' && (
        <CardContent className="pt-0">
          <p className="text-xs text-destructive">
            Notifications are blocked. Please allow them in your browser settings.
          </p>
        </CardContent>
      )}
    </Card>
  );
};
