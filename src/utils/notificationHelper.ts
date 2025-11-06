import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 
  | 'quest_approved'
  | 'quest_rejected'
  | 'badge_earned'
  | 'comment_received'
  | 'like_received'
  | 'team_invite'
  | 'challenge_completed'
  | 'daily_challenge_reset';

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
}

export const sendNotification = async (params: SendNotificationParams) => {
  try {
    // Try edge function first
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        related_id: params.relatedId,
        related_type: params.relatedType,
      },
    });

    if (error) throw error;
    
    // Play notification sound if enabled
    playNotificationSound();
    
    // Show browser push notification if enabled
    showBrowserNotification(params.title, params.message);
    
    return data;
  } catch (error) {
    console.warn('⚠️ Edge function failed, trying direct database insert:', error);
    
    // Fallback: try direct insert, then database function if that fails
    try {
      // First try direct insert (should work if RLS policies are set up)
      const { data: notificationData, error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          related_id: params.relatedId,
          related_type: params.relatedType,
        })
        .select()
        .single();

      if (insertError) {
        // If direct insert fails due to RLS, try using the database function
        console.warn('⚠️ Direct insert failed, trying database function:', insertError);
        
        const { data: functionData, error: functionError } = await supabase.rpc(
          'create_notification',
          {
            p_user_id: params.userId,
            p_type: params.type,
            p_title: params.title,
            p_message: params.message,
            p_related_id: params.relatedId || null,
            p_related_type: params.relatedType || null,
          }
        );

        if (functionError) {
          console.error('❌ Database function also failed:', functionError);
          throw functionError;
        }

        // Fetch the created notification
        const { data: fetchedNotification } = await supabase
          .from('notifications')
          .select('*')
          .eq('id', functionData)
          .single();

        console.log('✅ Notification created via database function:', fetchedNotification);
        
        // Play notification sound if enabled
        playNotificationSound();
        
        // Show browser push notification if enabled
        showBrowserNotification(params.title, params.message);
        
        return fetchedNotification;
      }

      // If we get here, direct insert succeeded
      console.log('✅ Notification created directly in database:', notificationData);
      
      // Play notification sound if enabled
      playNotificationSound();
      
      // Show browser push notification if enabled
      showBrowserNotification(params.title, params.message);
      
      return notificationData;
    } catch (fallbackError) {
      console.error('❌ All notification methods failed (edge function, direct insert, database function):', fallbackError);
      throw fallbackError;
    }
  }
};

export const playNotificationSound = () => {
  const soundEnabled = localStorage.getItem('notification_sound_enabled') !== 'false';
  if (!soundEnabled) return;
  
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(err => console.log('Audio play prevented:', err));
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

export const showBrowserNotification = async (title: string, body: string) => {
  if (!('Notification' in window)) return;
  
  const pushEnabled = localStorage.getItem('push_notifications_enabled') !== 'false';
  if (!pushEnabled) return;
  
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/discovery-atlas-logo.png',
        badge: '/discovery-atlas-logo.png',
        tag: 'discovery-atlas-notification',
      });
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};
