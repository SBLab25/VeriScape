// @ts-nocheck
import React from 'react';
import { Button } from '@/components/ui/button';
import { Ban, UserCheck2 } from 'lucide-react';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BlockUserButtonProps {
  userId: string;
  username?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'ghost' | 'outline' | 'destructive';
}

export const BlockUserButton = ({ userId, username, size = 'sm', variant = 'ghost' }: BlockUserButtonProps) => {
  const { isBlocked, toggleBlock } = useBlockedUsers();
  const blocked = isBlocked(userId);

  if (blocked) {
    return (
      <Button size={size} variant="outline" onClick={() => toggleBlock(userId)} className="text-muted-foreground">
        <UserCheck2 className="h-4 w-4 mr-1" />
        Unblock
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size={size} variant={variant} className="text-destructive hover:text-destructive">
          <Ban className="h-4 w-4 mr-1" />
          Block
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {username || 'this user'}?</AlertDialogTitle>
          <AlertDialogDescription>
            They won't be able to message you or see your activity. You can unblock them anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => toggleBlock(userId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Block
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
