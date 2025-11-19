import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Hash, Users, Settings, MessageSquare, Video, Phone } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { MembersPanel } from './MembersPanel';
import { CallButton } from './CallButton';
import { GroupCallButton } from './GroupCallButton';
import { ChannelSettingsDialog } from './ChannelSettingsDialog';
import { cn } from '@/lib/utils';

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

interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'FILE' | 'VOICE' | 'SYSTEM';
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  reactions: Array<{
    id: string;
    emoji: string;
    user: {
      id: string;
      name: string;
    };
  }>;
}

interface ChatPanelProps {
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
}

export function ChatPanel({ selectedChannelId, onChannelSelect }: ChatPanelProps) {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { send, connected } = useWebSocket();

  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'LIST_CHANNEL' | 'GROUP'>('LIST_CHANNEL');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  // Fetch channels
  const { data: channels = [], isLoading: isLoadingChannels } = useQuery<Channel[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels'],
    enabled: !!currentWorkspace?.id,
  });

  // Fetch messages for selected channel
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['/api/channels', selectedChannelId, 'messages'],
    enabled: !!selectedChannelId,
  });

  // Subscribe to channel messages via WebSocket
  useEffect(() => {
    if (selectedChannelId && connected) {
      send({
        type: 'subscribe_channel',
        payload: { channelId: selectedChannelId },
      });

      return () => {
        send({
          type: 'unsubscribe_channel',
          payload: { channelId: selectedChannelId },
        });
      };
    }
  }, [selectedChannelId, connected, send]);

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message:created') {
          queryClient.invalidateQueries({
            queryKey: ['/api/channels', data.payload.channelId, 'messages']
          });
          queryClient.invalidateQueries({
            queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels']
          });
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    // Ideally this should be handled in the WebSocketContext or a custom hook to avoid duplicated listeners
  }, [queryClient, currentWorkspace]);

  const createChannelMutation = useMutation({
    mutationFn: (data: { name: string; type: string; workspaceId: string }) =>
      apiRequest('POST', '/api/channels', data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels']
      });
      setNewChannelName('');
      setShowCreateChannel(false);
      toast({
        title: 'Channel created',
        description: 'Your channel has been created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create channel',
      });
    },
  });

  const joinChannelMutation = useMutation({
    mutationFn: (channelId: string) =>
      apiRequest('POST', `/api/channels/${channelId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels']
      });
      toast({
        title: 'Joined channel',
        description: 'You have joined the channel',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to join channel',
      });
    },
  });

  const handleCreateChannel = () => {
    if (!newChannelName.trim() || !currentWorkspace) return;

    createChannelMutation.mutate({
      name: newChannelName.trim(),
      type: newChannelType,
      workspaceId: currentWorkspace.id,
    });
  };

  const handleJoinChannel = (channelId: string) => {
    joinChannelMutation.mutate(channelId);
  };

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  // Categorize channels
  const listChannels = channels.filter(c => c.type === 'LIST_CHANNEL');
  const groupChannels = channels.filter(c => c.type === 'GROUP');
  const dmChannels = channels.filter(c => c.type === 'DIRECT_MESSAGE');

  return (
    <div className="flex h-full overflow-hidden bg-background rounded-xl shadow-sm border border-border/40">
      {/* Channel List Sidebar */}
      <div className="w-72 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b bg-background/50 backdrop-blur-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {t('chat.channels')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {currentWorkspace?.name}
          </p>
        </div>

        <ScrollArea className="flex-1 p-3">
          {isLoadingChannels ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted/50 animate-pulse rounded-md" />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <Hash className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">No channels yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first channel to get started
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* List Channels */}
              {listChannels.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">
                    List Channels
                  </div>
                  {listChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-200",
                        selectedChannelId === channel.id 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => onChannelSelect(channel.id)}
                    >
                      <Hash className="h-4 w-4 flex-shrink-0 opacity-70" />
                      <div className="flex-1 min-w-0 truncate text-sm">{channel.name}</div>
                      {channel._count.messages > 0 && (
                        <Badge variant="secondary" className="h-5 min-w-[1.25rem] px-1 text-[10px] flex items-center justify-center">
                          {channel._count.messages > 99 ? '99+' : channel._count.messages}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Group Channels */}
              {groupChannels.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">
                    Groups
                  </div>
                  {groupChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-200",
                        selectedChannelId === channel.id 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => onChannelSelect(channel.id)}
                    >
                      <Users className="h-4 w-4 flex-shrink-0 opacity-70" />
                      <div className="flex-1 min-w-0 truncate text-sm">{channel.name}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Direct Messages */}
              {dmChannels.length > 0 && (
                <div className="space-y-1">
                   <div className="text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">
                    Direct Messages
                  </div>
                  {dmChannels.map((channel) => {
                     const otherMember = channel.members.find(m => m.user.id !== user?.id)?.user;
                     return (
                      <div
                        key={channel.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-200",
                          selectedChannelId === channel.id 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => onChannelSelect(channel.id)}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">
                            {otherMember?.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 truncate text-sm">
                          {otherMember?.name || channel.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t bg-background/50 backdrop-blur-sm">
          {showCreateChannel ? (
            <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
              <Input
                placeholder="Channel name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
                className="h-8 text-sm"
                autoFocus
              />
              <Select value={newChannelType} onValueChange={(value: 'LIST_CHANNEL' | 'GROUP') => setNewChannelType(value)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIST_CHANNEL">📋 List Channel</SelectItem>
                  <SelectItem value="GROUP">👥 Group Chat</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim() || createChannelMutation.isPending}
                  className="flex-1 h-8"
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateChannel(false);
                    setNewChannelName('');
                    setNewChannelType('LIST_CHANNEL');
                  }}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateChannel(true)}
              className="w-full justify-start text-muted-foreground hover:text-primary border-dashed"
            >
              <Hash className="h-4 w-4 mr-2" />
              Create New Channel
            </Button>
          )}

          {/* Settings Button */}
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="w-full justify-start text-xs text-muted-foreground"
              disabled={!selectedChannel}
            >
              <Settings className="h-3 w-3 mr-2" />
              Channel Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {selectedChannel ? (
          selectedChannel.members && Array.isArray(selectedChannel.members) ? (
          <>
            {/* Channel Header */}
            <div className="h-16 px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {selectedChannel.type === 'DIRECT_MESSAGE' ? (
                     <Avatar className="h-10 w-10">
                       <AvatarFallback>
                         {selectedChannel.members.find(m => m.user.id !== user?.id)?.user.name.charAt(0).toUpperCase()}
                       </AvatarFallback>
                     </Avatar>
                  ) : (
                    <Hash className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg leading-none tracking-tight">{selectedChannel.name}</h3>
                  <button
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-1"
                    onClick={() => setShowMembersPanel(!showMembersPanel)}
                  >
                    <Users className="h-3 w-3" />
                    {selectedChannel._count.members} members
                    {selectedChannel.list && <span className="opacity-50">• {selectedChannel.list.name}</span>}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedChannel.type === 'DIRECT_MESSAGE' && selectedChannel.members.length === 2 && (
                  <CallButton
                    remoteUser={selectedChannel.members.find(m => m.user.id !== user?.id)?.user || selectedChannel.members[0].user}
                    channelId={selectedChannel.id}
                    variant="default"
                  />
                )}
                {(selectedChannel.type === 'GROUP' || selectedChannel.members.length > 2) && (
                  <GroupCallButton
                    channelId={selectedChannel.id}
                    variant="default"
                  />
                )}
                <Button variant="ghost" size="icon" onClick={() => setShowMembersPanel(!showMembersPanel)}>
                  <Users className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden relative">
               {/* Decorative background pattern */}
               <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                  backgroundSize: '24px 24px'
                }} />
                
              <MessageList
                messages={messages}
                isLoading={isLoadingMessages}
                channelId={selectedChannelId!}
              />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <MessageInput
                channelId={selectedChannelId!}
                onMessageSent={() => {
                  queryClient.invalidateQueries({
                    queryKey: ['/api/channels', selectedChannelId, 'messages']
                  });
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto animate-pulse">
                 <Hash className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Loading channel...</h3>
                <p className="text-muted-foreground">Fetching channel data</p>
              </div>
            </div>
          </div>
        )
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/5">
            <div className="text-center space-y-6 max-w-md px-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome to Chat</h2>
                <p className="text-muted-foreground text-lg">
                  Select a channel from the sidebar or create a new one to start collaborating with your team.
                </p>
              </div>
              <div className="flex justify-center gap-4 pt-4">
                 <Button onClick={() => setShowCreateChannel(true)}>
                    <Hash className="h-4 w-4 mr-2" />
                    Create Channel
                 </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Members Panel */}
      {showMembersPanel && selectedChannel && (
        <div className="w-72 border-l bg-background animate-in slide-in-from-right duration-300">
           <MembersPanel
             channel={selectedChannel}
             onClose={() => setShowMembersPanel(false)}
           />
        </div>
      )}

      {/* Channel Settings Dialog */}
      {selectedChannel && (
        <ChannelSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          channel={selectedChannel}
          onChannelUpdated={() => {
            queryClient.invalidateQueries({
              queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels']
            });
          }}
        />
      )}
    </div>
  );
}
