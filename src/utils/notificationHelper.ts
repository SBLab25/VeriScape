// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/utils/edgeFunctionClient';

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
    // Insert notification directly via supabase client
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        related_id: params.relatedId || null,
        related_type: params.relatedType || null,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Notification creation failed:', error);
      return null;
    }

    console.log('✅ Notification created:', data);
    
    playNotificationSound();
    showBrowserNotification(params.title, params.message);

    // Also try web push
    try {
      await invokeEdgeFunction('send-push-notification', {
        user_id: params.userId,
        title: params.title,
        body: params.message,
        url: params.relatedType === 'quest' ? `/quest/${params.relatedId}` : '/',
        related_id: params.relatedId,
        related_type: params.relatedType,
      });
    } catch (pushError) {
      console.warn('Web push notification failed (non-critical):', pushError);
    }
    
    return data;
  } catch (error) {
    console.error('❌ All notification methods failed:', error);
    return null;
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