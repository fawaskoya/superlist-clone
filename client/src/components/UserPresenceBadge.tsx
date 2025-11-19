import React from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface UserPresence {
  id: string;
  userId: string;
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
  customMessage?: string | null;
  lastSeen: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface UserPresenceBadgeProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  presence?: UserPresence;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showName?: boolean;
}

export function UserPresenceBadge({
  user,
  presence,
  size = 'md',
  showStatus = true,
  showName = true
}: UserPresenceBadgeProps) {
  const getPresenceColor = (status?: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-500';
      case 'AWAY':
        return 'bg-yellow-500';
      case 'BUSY':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getPresenceText = (status?: string) => {
    switch (status) {
      case 'ONLINE':
        return 'Online';
      case 'AWAY':
        return 'Away';
      case 'BUSY':
        return 'Busy';
      default:
        return 'Offline';
    }
  };

  const avatarSize = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }[size];

  const indicatorSize = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  }[size];

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Avatar className={avatarSize}>
          <AvatarFallback className="text-xs">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {showStatus && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background',
              indicatorSize,
              getPresenceColor(presence?.status)
            )}
            title={`${user.name} is ${getPresenceText(presence?.status).toLowerCase()}`}
          />
        )}
      </div>

      {showName && (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{user.name}</span>
          {presence?.customMessage && (
            <span className="text-xs text-muted-foreground">
              {presence.customMessage}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Presence status indicator component
interface PresenceIndicatorProps {
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PresenceIndicator({ status, size = 'md', className }: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  }[size];

  return (
    <div
      className={cn(
        'rounded-full',
        sizeClasses,
        getPresenceColor(status),
        className
      )}
      title={getPresenceText(status)}
    />
  );
}




