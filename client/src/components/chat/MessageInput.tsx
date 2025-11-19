import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, AtSign } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  channelId: string;
  onMessageSent?: () => void;
  placeholder?: string;
}

export function MessageInput({
  channelId,
  onMessageSent,
  placeholder = "Type a message..."
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();

  // Fetch workspace members for mentions
  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'members'],
    enabled: !!currentWorkspace?.id && showMentions,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const messageData: any = {
        content,
        type: 'TEXT'
      };

      // Extract mentions from content
      const mentionedUserIds = extractMentions(content);
      if (mentionedUserIds.length > 0) {
        messageData.metadata = { mentions: mentionedUserIds };
      }

      return apiRequest('POST', `/api/channels/${channelId}/messages`, messageData);
    },
    onSuccess: (data) => {
      setMessage('');
      onMessageSent?.();

      // Send mention notifications if any
      if (data.metadata?.mentions?.length > 0) {
        apiRequest('POST', `/api/messages/${data.id}/mentions`, {
          mentionedUserIds: data.metadata.mentions,
        }).catch((error) => {
          console.error('Failed to send mention notifications:', error);
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to send message',
        description: error.message || 'An error occurred while sending your message',
      });
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Extract mentions from message content
  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(user:([a-zA-Z0-9-]+)\)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[2]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  };

  // Handle mention input
  const handleMentionSelect = (user: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const beforeCursor = message.substring(0, cursorPos);
    const afterCursor = message.substring(cursorPos);

    // Find the @ that triggered the mention
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex === -1) return;

    // Replace @mention with formatted mention
    const beforeAt = beforeCursor.substring(0, atIndex);
    const mentionText = `@[${user.name}](user:${user.id}) `;
    const newMessage = beforeAt + mentionText + afterCursor;

    setMessage(newMessage);
    setShowMentions(false);
    setMentionQuery('');

    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = beforeAt.length + mentionText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle input changes and detect mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @ mentions
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith('@')) {
      const query = currentWord.substring(1);
      setMentionQuery(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate(trimmedMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // Filter members based on mention query
  const filteredMembers = workspaceMembers.filter(member =>
    member.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Attachment button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-shrink-0 h-9 w-9 p-0"
          disabled={sendMessageMutation.isPending}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Voice message button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-shrink-0 h-9 w-9 p-0"
          disabled={sendMessageMutation.isPending}
        >
          <Mic className="h-4 w-4" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            disabled={sendMessageMutation.isPending}
            className={cn(
              "min-h-9 max-h-32 resize-none border-0 shadow-none focus-visible:ring-0 px-3 py-2",
              "bg-muted/50 focus:bg-background transition-colors"
            )}
            rows={1}
          />

          {/* Character count indicator (optional) */}
          {message.length > 500 && (
            <div className="absolute -top-6 right-0 text-xs text-muted-foreground">
              {message.length}/2000
            </div>
          )}
        </div>

        {/* Send button */}
        <Button
          type="submit"
          size="sm"
          disabled={!message.trim() || sendMessageMutation.isPending || isComposing}
          className="flex-shrink-0 h-9 w-9 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Mention suggestions */}
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full mb-2 left-0 right-0 max-h-48 overflow-y-auto bg-popover border rounded-md shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <AtSign className="h-3 w-3" />
              Mention a team member
            </div>
            {filteredMembers.slice(0, 5).map((member) => (
              <button
                key={member.id}
                onClick={() => handleMentionSelect(member)}
                className="w-full text-left px-2 py-1 rounded hover:bg-accent flex items-center gap-2"
              >
                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                  {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{member.name}</div>
                  <div className="text-xs text-muted-foreground">{member.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
