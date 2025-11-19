import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { UserPresenceBadge } from './UserPresenceBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Calendar, Clock, MapPin, Briefcase, MessageCircle, ExternalLink, Phone, Video } from 'lucide-react';
import { CallButton } from './chat/CallButton';

interface User {
  id: string;
  name: string;
  email: string;
  organizationId?: string;
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserPresence {
  id: string;
  userId: string;
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
  customMessage?: string | null;
  lastSeen: string;
}

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function UserDetailsDialog({ open, onOpenChange, user }: UserDetailsDialogProps) {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch user presence
  const { data: presence } = useQuery<UserPresence>({
    queryKey: ['/api/users/presence', { userIds: user.id }],
    enabled: !!user.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch user's tasks count in current workspace
  const { data: userStats } = useQuery({
    queryKey: ['/api/users', user.id, 'stats', currentWorkspace?.id],
    enabled: !!user.id && !!currentWorkspace?.id,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatLastSeen = (lastSeenString: string) => {
    const lastSeen = new Date(lastSeenString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return formatDate(lastSeenString);
  };

  // Create direct message channel or find existing one
  const createDirectMessageMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace selected');

      // First check if a DM channel already exists with this user
      const channels = await apiRequest('GET', `/api/workspaces/${currentWorkspace.id}/channels`);
      const existingDM = channels.find((channel: any) =>
        channel.type === 'DIRECT_MESSAGE' &&
        channel.members.some((member: any) => member.user.id === user.id)
      );

      if (existingDM) {
        return existingDM;
      }

      // Create new DM channel
      const dmChannel = await apiRequest('POST', '/api/channels', {
        name: `DM with ${user.name}`,
        type: 'DIRECT_MESSAGE',
        workspaceId: currentWorkspace.id,
      });

      // Add the other user to the DM
      await apiRequest('POST', `/api/channels/${dmChannel.id}/members`, {
        userId: user.id,
      });

      return dmChannel;
    },
    onSuccess: (channel) => {
      // Refresh channels list
      queryClient.invalidateQueries({
        queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels']
      });

      // Navigate to the chat page
      setLocation(`/chat`);
      // Close the dialog
      onOpenChange(false);
      toast({
        title: 'Direct message started',
        description: `Started a conversation with ${user.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to start direct message',
      });
    },
  });

  const handleSendMessage = () => {
    // Prevent messaging yourself
    if (user.id === currentUser?.id) {
      toast({
        variant: 'destructive',
        title: 'Cannot message yourself',
        description: 'You cannot start a direct message with yourself',
      });
      return;
    }

    createDirectMessageMutation.mutate();
  };

  const handleSendEmail = () => {
    // Open default email client
    window.open(`mailto:${user.email}`, '_blank');
    toast({
      title: 'Email client opened',
      description: `Opening email to ${user.email}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Avatar and Basic Info */}
          <div className="flex flex-col items-center space-y-4">
            <UserPresenceBadge
              user={user}
              presence={presence}
              size="lg"
              showName={false}
            />
            <div className="text-center">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <button
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                onClick={handleSendEmail}
              >
                <Mail className="h-3 w-3" />
                {user.email}
                <ExternalLink className="h-3 w-3" />
              </button>
              {user.isAdmin && (
                <Badge variant="secondary" className="mt-2">
                  Administrator
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full">
              <Button
                onClick={handleSendMessage}
                disabled={createDirectMessageMutation.isPending}
                className="flex-1"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {createDirectMessageMutation.isPending ? 'Starting...' : 'Message'}
              </Button>
              <Button
                variant="outline"
                onClick={handleSendEmail}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>

            {/* Call Buttons */}
            <div className="flex gap-2 w-full mt-2">
              <CallButton
                remoteUser={user}
                variant="default"
              />
            </div>
          </div>

          <Separator />

          {/* Presence Status */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Status
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {presence?.status === 'ONLINE' && '🟢 Online'}
                {presence?.status === 'AWAY' && '🟡 Away'}
                {presence?.status === 'BUSY' && '🔴 Busy'}
                {presence?.status === 'OFFLINE' && '⚫ Offline'}
              </span>
              {presence?.lastSeen && (
                <span className="text-xs text-muted-foreground">
                  Last seen {formatLastSeen(presence.lastSeen)}
                </span>
              )}
            </div>
            {presence?.customMessage && (
              <p className="text-sm text-muted-foreground italic">
                "{presence.customMessage}"
              </p>
            )}
          </div>

          {/* Account Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Account Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Workspace Statistics */}
          {userStats && currentWorkspace && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Workspace Activity</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {userStats.totalTasks || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Tasks</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {userStats.completedTasks || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
