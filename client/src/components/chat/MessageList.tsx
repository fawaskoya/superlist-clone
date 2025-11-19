import React, { useEffect, useRef, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageReactions } from './MessageReactions';
import { UserPresenceBadge } from '../UserPresenceBadge';
import { UserDetailsDialog } from '../UserDetailsDialog';

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

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  channelId: string;
}

export function MessageList({ messages, isLoading, channelId }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Fetch presence data for all unique users in messages
  const uniqueUserIds = [...new Set(messages.map(m => m.author.id))];
  const { data: presenceData } = useQuery({
    queryKey: ['/api/users/presence', { userIds: uniqueUserIds }],
    enabled: uniqueUserIds.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      const date = format(new Date(message.createdAt), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  const renderMessageContent = (content: string) => {
    // Parse mentions in format @[Name](user:id)
    const mentionRegex = /@\[([^\]]+)\]\(user:([a-zA-Z0-9-]+)\)/g;

    const parts: (string | { type: 'mention'; name: string; userId: string })[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add mention
      parts.push({
        type: 'mention',
        name: match[1],
        userId: match[2],
      });

      lastIndex = mentionRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    // If no mentions found, return original content
    if (parts.length === 0) {
      return content;
    }

    return parts.map((part, index) => {
      if (typeof part === 'string') {
        return part;
      } else {
        return (
          <span
            key={index}
            className="bg-primary/20 text-primary px-1 py-0.5 rounded text-xs font-medium hover:bg-primary/30 transition-colors cursor-pointer"
            title={`@${part.name}`}
          >
            @{part.name}
          </span>
        );
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="text-6xl">💬</div>
          <div>
            <h3 className="font-semibold">Welcome to the channel!</h3>
            <p className="text-muted-foreground text-sm">
              This is the beginning of the conversation. Say hello!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
      <div className="space-y-4">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-6">
              <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                {getDateLabel(date)}
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-2">
              {dateMessages.map((message, index) => {
                const prevMessage = dateMessages[index - 1];
                const showAvatar = !prevMessage || prevMessage.author.id !== message.author.id;
                const showTimestamp = !prevMessage ||
                  prevMessage.author.id !== message.author.id ||
                  new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 5 * 60 * 1000; // 5 minutes

                return (
                  <div key={message.id} className="group flex gap-3 hover:bg-muted/30 px-2 py-1 rounded-md -mx-2">
                    {showAvatar ? (
                      <div
                        className="flex-shrink-0 mt-1 cursor-pointer"
                        onClick={() => {
                          setSelectedUser(message.author);
                          setShowUserDetails(true);
                        }}
                      >
                        <UserPresenceBadge
                          user={message.author}
                          presence={presenceData?.find(p => p.userId === message.author.id)}
                          size="sm"
                          showName={false}
                        />
                      </div>
                    ) : (
                      <div className="w-8 flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold text-sm">{message.author.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatMessageTime(new Date(message.createdAt))}
                          </span>
                        </div>
                      )}

                      {!showAvatar && showTimestamp && (
                        <div className="text-xs text-muted-foreground mb-1">
                          {formatMessageTime(new Date(message.createdAt))}
                        </div>
                      )}

                      <div className="text-sm leading-relaxed break-words">
                        {renderMessageContent(message.content)}
                      </div>

                      {/* Message reactions */}
                      {message.reactions.length > 0 && (
                        <MessageReactions
                          reactions={message.reactions}
                          messageId={message.id}
                        />
                      )}

                      {/* Message actions (visible on hover) */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            // TODO: Add reaction picker
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* User Details Dialog */}
      {selectedUser && (
        <UserDetailsDialog
          open={showUserDetails}
          onOpenChange={setShowUserDetails}
          user={selectedUser}
        />
      )}
    </ScrollArea>
  );
}
