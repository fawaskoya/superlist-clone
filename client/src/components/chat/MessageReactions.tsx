import React, { useState } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Reaction {
  id: string;
  emoji: string;
  user: {
    id: string;
    name: string;
  };
}

interface MessageReactionsProps {
  reactions: Reaction[];
  messageId: string;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '🤔'];

export function MessageReactions({ reactions, messageId }: MessageReactionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  const addReactionMutation = useMutation({
    mutationFn: (emoji: string) =>
      apiRequest('POST', `/api/messages/${messageId}/reactions`, { emoji }),
    onSuccess: () => {
      setShowEmojiPicker(false);
      toast({
        title: 'Reaction added',
        description: `You reacted with ${reactions.find(r => r.emoji === reactions[reactions.length - 1]?.emoji)?.emoji || 'emoji'}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to add reaction',
        description: error.message || 'Could not add your reaction',
      });
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: (emoji: string) =>
      apiRequest('DELETE', `/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),
    onSuccess: () => {
      toast({
        title: 'Reaction removed',
        description: 'Your reaction has been removed',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to remove reaction',
        description: error.message || 'Could not remove your reaction',
      });
    },
  });

  const createTaskFromMessageMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; priority: string; workspaceId: string }) =>
      apiRequest('POST', `/api/workspaces/${data.workspaceId}/tasks`, {
        title: data.title,
        description: data.description,
        priority: data.priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      setShowTaskDialog(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('MEDIUM');
      toast({
        title: 'Task created',
        description: 'A new task has been created from this message',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create task',
        description: error.message || 'Could not create task from message',
      });
    },
  });

  const handleAddReaction = (emoji: string) => {
    addReactionMutation.mutate(emoji);
  };

  const handleRemoveReaction = (emoji: string) => {
    removeReactionMutation.mutate(emoji);
  };

  const handleCreateTaskFromMessage = () => {
    if (!taskTitle.trim() || !currentWorkspace) return;

    createTaskFromMessageMutation.mutate({
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      priority: taskPriority,
      workspaceId: currentWorkspace.id,
    });
  };

  const isReactedByCurrentUser = (emoji: string) => {
    // This would need to be implemented with current user context
    // For now, we'll assume no reactions are by current user
    return false;
  };

  return (
    <>
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => (
          <Button
            key={emoji}
            variant={isReactedByCurrentUser(emoji) ? "secondary" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs hover:bg-muted"
            onClick={() => {
              if (isReactedByCurrentUser(emoji)) {
                handleRemoveReaction(emoji);
              } else {
                handleAddReaction(emoji);
              }
            }}
          >
            <span className="mr-1">{emoji}</span>
            <span className="text-muted-foreground">{emojiReactions.length}</span>
          </Button>
        ))}

        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
              disabled={addReactionMutation.isPending}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-5 gap-1">
              {COMMON_EMOJIS.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  onClick={() => handleAddReaction(emoji)}
                  disabled={addReactionMutation.isPending}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Create Task from Message button */}
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs hover:bg-muted"
              title="Create task from this message"
            >
              <CheckCircle className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Task from Message</DialogTitle>
              <DialogDescription>
                Create a new task based on this chat message.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Task Title</Label>
                <Input
                  id="task-title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <Label htmlFor="task-description">Description (Optional)</Label>
                <Textarea
                  id="task-description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={taskPriority} onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') => setTaskPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateTaskFromMessage}
                disabled={!taskTitle.trim() || createTaskFromMessageMutation.isPending}
              >
                {createTaskFromMessageMutation.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
