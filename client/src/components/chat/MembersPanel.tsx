import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { X, Users, Crown, User } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { UserPresenceBadge } from '../UserPresenceBadge';
import { UserDetailsDialog } from '../UserDetailsDialog';

interface Channel {
  id: string;
  name: string;
  type: 'LIST_CHANNEL' | 'DIRECT_MESSAGE' | 'GROUP';
  list?: {
    id: string;
    name: string;
  };
  members: Array<{
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  _count: {
    messages: number;
    members: number;
  };
}

interface MembersPanelProps {
  channel: Channel;
  onClose: () => void;
}

export function MembersPanel({ channel, onClose }: MembersPanelProps) {
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Fetch presence data for all channel members
  const memberUserIds = channel.members.map(m => m.user.id);
  const { data: presenceData } = useQuery({
    queryKey: ['/api/users/presence', { userIds: memberUserIds }],
    enabled: memberUserIds.length > 0,
    refetchInterval: 30000,
  });

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  return (
    <>
      {/* Members Panel */}
      <div className="w-80 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Members</h3>
              <Badge variant="secondary" className="text-xs">
                {channel.members.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {channel.name}
          </p>
        </div>

        {/* Members List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <div className="space-y-1">
              {channel.members.map((member) => {
                const presence = presenceData?.find(p => p.userId === member.user.id);

                return (
                  <div
                    key={member.user.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleUserClick(member.user)}
                  >
                    <UserPresenceBadge
                      user={member.user}
                      presence={presence}
                      size="md"
                      showName={true}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {member.user.name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {member.user.email}
                      </div>
                      {presence?.customMessage && (
                        <div className="text-xs text-muted-foreground italic mt-1 truncate">
                          "{presence.customMessage}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {channel.members.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No members yet</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with channel info */}
        <div className="p-4 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="capitalize">
                {channel.type.replace('_', ' ').toLowerCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Messages:</span>
              <span>{channel._count.messages}</span>
            </div>
            {channel.list && (
              <div className="flex justify-between">
                <span>Linked to:</span>
                <span>{channel.list.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Details Dialog */}
      {selectedUser && (
        <UserDetailsDialog
          open={showUserDetails}
          onOpenChange={setShowUserDetails}
          user={selectedUser}
        />
      )}
    </>
  );
}
