import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, X, Crown, UserMinus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { OrganizationUserSearch } from '@/components/OrganizationUserSearch';
import { UserPresenceBadge } from '../UserPresenceBadge';
import { UserDetailsDialog } from '../UserDetailsDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface ChannelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  onChannelUpdated: () => void;
}

export function ChannelSettingsDialog({
  open,
  onOpenChange,
  channel,
  onChannelUpdated,
}: ChannelSettingsDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  const [selectedChannelId, setSelectedChannelId] = useState(channel.id);
  const [channelName, setChannelName] = useState(channel.name);
  const [channelType, setChannelType] = useState(channel.type);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Fetch all channels in workspace
  const { data: allChannels = [] } = useQuery({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels'],
    enabled: !!currentWorkspace?.id,
  });

  // Get the currently selected channel
  const selectedChannel = allChannels.find(c => c.id === selectedChannelId) || channel;

  // Fetch presence data for all channel members
  const memberUserIds = selectedChannel?.members?.map(m => m.user.id) || [];
  const { data: presenceData } = useQuery({
    queryKey: ['/api/users/presence', { userIds: memberUserIds }],
    enabled: memberUserIds.length > 0,
    refetchInterval: 30000,
  });

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: (data: { name?: string; type?: string }) =>
      apiRequest('PUT', `/api/channels/${selectedChannelId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels']
      });
      onChannelUpdated();
      toast({
        title: 'Channel updated',
        description: 'Channel settings have been updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update channel',
      });
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest('POST', `/api/channels/${selectedChannelId}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels']
      });
      onChannelUpdated();
      setShowAddMember(false);
      toast({
        title: 'Member added',
        description: 'User has been added to the channel',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add member',
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest('DELETE', `/api/channels/${selectedChannelId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels']
      });
      onChannelUpdated();
      toast({
        title: 'Member removed',
        description: 'User has been removed from the channel',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to remove member',
      });
    },
  });

  const handleSaveSettings = () => {
    const updates: { name?: string; type?: string } = {};

    if (channelName !== channel.name) {
      updates.name = channelName;
    }

    if (channelType !== channel.type) {
      updates.type = channelType;
    }

    if (Object.keys(updates).length > 0) {
      updateChannelMutation.mutate(updates);
    }
  };

  const handleAddMember = (userId: string) => {
    addMemberMutation.mutate(userId);
  };

  const handleRemoveMember = (userId: string) => {
    removeMemberMutation.mutate(userId);
  };

  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
    const newChannel = allChannels.find(c => c.id === channelId);
    if (newChannel) {
      setChannelName(newChannel.name);
      setChannelType(newChannel.type);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Channel Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members ({selectedChannel?.members?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="channelSelect">Select Channel</Label>
              <Select value={selectedChannelId} onValueChange={handleChannelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {allChannels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.name} ({ch.type.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channelName">Channel Name</Label>
              <Input
                id="channelName"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Enter channel name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channelType">Channel Type</Label>
              <Select value={channelType} onValueChange={setChannelType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIST_CHANNEL">List Channel</SelectItem>
                  <SelectItem value="GROUP">Group Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Channel Info</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Type:</strong> {selectedChannel?.type?.replace('_', ' ') || 'Unknown'}</p>
                <p><strong>Members:</strong> {selectedChannel?.members?.length || 0}</p>
                <p><strong>Messages:</strong> {selectedChannel?._count?.messages || 0}</p>
                {selectedChannel?.list && (
                  <p><strong>Linked List:</strong> {selectedChannel.list.name}</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleSaveSettings}
              disabled={updateChannelMutation.isPending}
              className="w-full"
            >
              {updateChannelMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </TabsContent>

          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Channel Members</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddMember(true)}
                disabled={!selectedChannel}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>

            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {selectedChannel?.members?.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => {
                        setSelectedUser(member.user);
                        setShowUserDetails(true);
                      }}
                    >
                      <UserPresenceBadge
                        user={member.user}
                        presence={presenceData?.find(p => p.userId === member.user.id)}
                        size="sm"
                        showName={true}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.user.id)}
                      disabled={removeMemberMutation.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!selectedChannel?.members || selectedChannel.members.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <h3 className="text-lg font-medium">No members in this channel</h3>
                    <p className="text-sm">
                      {selectedChannel ? 'Add members to start collaborating.' : 'Select a channel first.'}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {showAddMember && selectedChannel && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-medium">Add New Member</h4>
                  <OrganizationUserSearch
                    onUserSelect={(user) => handleAddMember(user.id)}
                    excludeUserIds={selectedChannel?.members?.map(m => m.user.id) || []}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddMember(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* User Details Dialog */}
        {selectedUser && (
          <UserDetailsDialog
            open={showUserDetails}
            onOpenChange={setShowUserDetails}
            user={selectedUser}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
