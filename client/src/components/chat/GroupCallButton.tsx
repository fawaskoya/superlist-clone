import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Video, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoCallDialog } from './VideoCallDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface GroupCallButtonProps {
  channelId?: string;
  variant?: 'button' | 'icon';
}

interface ChannelMember {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function GroupCallButton({ channelId, variant = 'button' }: GroupCallButtonProps) {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callId, setCallId] = useState<string>();

  // Fetch channel members if we have a channelId
  const { data: channelMembers = [] } = useQuery<ChannelMember[]>({
    queryKey: ['/api/channels', channelId, 'members'],
    enabled: !!channelId,
  });

  // Fetch organization users for broader selection
  const { data: organizationUsers = [] } = useQuery({
    queryKey: ['/api/organization/users'],
    enabled: !channelId, // Only fetch if no channel context
  });

  const availableUsers = channelId ? channelMembers.map(cm => cm.user) : organizationUsers;

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const startGroupCall = () => {
    if (selectedUsers.length === 0) return;

    setCallId(`group_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    setShowCallDialog(true);
    setShowUserSelector(false);
  };

  const selectedUserObjects = availableUsers.filter(user => selectedUsers.includes(user.id));

  const buttonContent = variant === 'icon' ? (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Users className="h-4 w-4" />
    </Button>
  ) : (
    <Button variant="outline" className="flex items-center gap-2">
      <Users className="h-4 w-4" />
      {t('chat.groupCall', { defaultValue: 'Group Call' })}
    </Button>
  );

  return (
    <>
      <Dialog open={showUserSelector} onOpenChange={setShowUserSelector}>
        <DialogTrigger asChild>
          {buttonContent}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('chat.selectParticipants', { defaultValue: 'Select Participants' })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Call type selection */}
            <div className="flex gap-2">
              <Button
                variant={callType === 'audio' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCallType('audio')}
                className="flex-1"
              >
                <Phone className="h-4 w-4 mr-2" />
                {t('chat.audioCall', { defaultValue: 'Audio' })}
              </Button>
              <Button
                variant={callType === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCallType('video')}
                className="flex-1"
              >
                <Video className="h-4 w-4 mr-2" />
                {t('chat.videoCall', { defaultValue: 'Video' })}
              </Button>
            </div>

            {/* User selection */}
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {availableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleUserToggle(user.id)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                    />
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUserSelector(false)}
                className="flex-1"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                onClick={startGroupCall}
                disabled={selectedUsers.length === 0}
                className="flex-1"
              >
                {t('chat.startCall', { defaultValue: 'Start Call' })}
                {selectedUsers.length > 0 && ` (${selectedUsers.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VideoCallDialog
        open={showCallDialog}
        onOpenChange={setShowCallDialog}
        callType={callType}
        remoteUsers={selectedUserObjects}
        channelId={channelId}
        callId={callId}
        isGroupCall={true}
      />
    </>
  );
}
