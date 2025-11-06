import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, CheckSquare, Flag } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TaskActivityTimeline } from './TaskActivityTimeline';
import { MarkdownEditor } from './MarkdownEditor';
import { FileAttachments } from './FileAttachments';
import type { Task, TaskStatus, TaskPriority, TaskComment, InsertTask, List } from '@shared/schema';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { format } from 'date-fns';

interface TaskDetailsDrawerProps {
  task: Task | null;
  onClose: () => void;
  listId: string | null;
}

export function TaskDetailsDrawer({ task, onClose, listId }: TaskDetailsDrawerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(listId);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(new Set());

  // Fetch available lists for the list selector
  const { data: lists } = useQuery<List[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'lists'],
    enabled: !!currentWorkspace?.id,
  });

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
      setSelectedListId(task.listId);
    }
  }, [task]);

  const { data: comments } = useQuery<TaskComment[]>({
    queryKey: ['/api/tasks', task?.id, 'comments'],
    enabled: !!task?.id,
  });

  const { data: subtasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks', task?.id, 'subtasks'],
    enabled: !!task?.id,
  });

  const invalidateTaskCaches = () => {
    // Invalidate all possible task caches
    if (listId) {
      queryClient.invalidateQueries({ queryKey: ['/api/lists', listId, 'tasks'] });
    }
    if (selectedListId) {
      queryClient.invalidateQueries({ queryKey: ['/api/lists', selectedListId, 'tasks'] });
    }
    if (currentWorkspace?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', currentWorkspace.id, 'tasks'] });
    }
  };

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Task>) =>
      apiRequest('PATCH', `/api/tasks/${task?.id}`, data),
    onSuccess: () => {
      invalidateTaskCaches();
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (body: string) =>
      apiRequest('POST', `/api/tasks/${task?.id}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task?.id, 'comments'] });
      setNewComment('');
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (subtaskTitle: string) => {
      const endpoint = selectedListId 
        ? `/api/lists/${selectedListId}/tasks`
        : `/api/workspaces/${currentWorkspace?.id}/tasks`;
      return apiRequest('POST', endpoint, {
        title: subtaskTitle,
        parentId: task?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task?.id, 'subtasks'] });
      invalidateTaskCaches();
      setNewSubtask('');
    },
  });

  const aiSummarizeMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ summary: string }>('POST', '/api/ai/summarize-task', {
        title: task?.title,
        description: task?.description || '',
      }),
    onSuccess: (data) => {
      setAiSummary(data.summary);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message,
      });
    },
  });

  const aiGenerateSubtasksMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ subtasks: string[] }>('POST', '/api/ai/generate-subtasks', {
        title: task?.title,
        description: task?.description || '',
      }),
    onSuccess: (data) => {
      setSuggestedSubtasks(data.subtasks);
      setSelectedSubtasks(new Set(data.subtasks.map((_, i) => i)));
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message,
      });
    },
  });

  const aiPrioritizeMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ tasks: Array<{ id: string; suggestedPriority: TaskPriority }> }>(
        'POST',
        '/api/ai/prioritize-tasks',
        {
          tasks: [
            {
              id: task?.id,
              title: task?.title,
              description: task?.description || '',
              priority: task?.priority,
            },
          ],
        }
      ),
    onSuccess: (data) => {
      const suggestedPriority = data.tasks[0]?.suggestedPriority;
      if (suggestedPriority) {
        setPriority(suggestedPriority);
        updateMutation.mutate({ priority: suggestedPriority });
        toast({
          title: t('common.success'),
          description: `Priority updated to ${suggestedPriority}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message,
      });
    },
  });

  const handleUpdate = (field: keyof Task, value: any) => {
    updateMutation.mutate({ [field]: value });
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment.trim());
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      createSubtaskMutation.mutate(newSubtask.trim());
    }
  };

  const handleAddSelectedSubtasks = () => {
    selectedSubtasks.forEach((index) => {
      createSubtaskMutation.mutate(suggestedSubtasks[index]);
    });
    setSuggestedSubtasks([]);
    setSelectedSubtasks(new Set());
  };

  if (!task) return null;

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-96 p-6 overflow-y-auto" data-testid="drawer-task-details">
        <SheetHeader className="mb-6">
          <SheetTitle className="sr-only">{t('task.taskDetails')}</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-6 top-6 h-8 w-8"
            data-testid="button-close-drawer"
          >
            <X className="h-5 w-5" />
          </Button>
        </SheetHeader>

        <div className="space-y-6">
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleUpdate('title', title)}
              className="text-xl font-semibold border-0 shadow-none px-0 focus-visible:ring-0"
              data-testid="input-task-title"
            />
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => aiSummarizeMutation.mutate()}
                disabled={aiSummarizeMutation.isPending}
                className="gap-2"
                data-testid="button-ai-summarize"
              >
                <Sparkles className="h-4 w-4" />
                {t('ai.summarize')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aiGenerateSubtasksMutation.mutate()}
                disabled={aiGenerateSubtasksMutation.isPending}
                className="gap-2"
                data-testid="button-ai-generate-subtasks"
              >
                <CheckSquare className="h-4 w-4" />
                {t('ai.generateSubtasks')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aiPrioritizeMutation.mutate()}
                disabled={aiPrioritizeMutation.isPending}
                className="gap-2"
                data-testid="button-ai-prioritize"
              >
                <Flag className="h-4 w-4" />
                {t('ai.suggestPriority')}
              </Button>
            </div>

            {aiSummary && (
              <div className="p-3 bg-muted rounded-lg text-sm" data-testid="text-ai-summary">
                <div className="font-medium mb-1">{t('ai.aiSummary')}</div>
                <div className="text-muted-foreground">{aiSummary}</div>
              </div>
            )}

            {suggestedSubtasks.length > 0 && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="font-medium text-sm">{t('ai.suggestedSubtasks')}</div>
                {suggestedSubtasks.map((subtask, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSubtasks.has(index)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedSubtasks);
                        if (checked) {
                          newSelected.add(index);
                        } else {
                          newSelected.delete(index);
                        }
                        setSelectedSubtasks(newSelected);
                      }}
                    />
                    <span className="text-sm">{subtask}</span>
                  </div>
                ))}
                <Button
                  size="sm"
                  onClick={handleAddSelectedSubtasks}
                  disabled={selectedSubtasks.size === 0}
                  className="w-full mt-2"
                  data-testid="button-add-selected-subtasks"
                >
                  {t('ai.addSelected')}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t('task.description')}</Label>
            <MarkdownEditor
              value={description}
              onChange={(value) => setDescription(value)}
              placeholder={t('task.description')}
              minHeight="min-h-32"
            />
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUpdate('description', description)}
                data-testid="button-save-description"
              >
                Save description
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('task.status')}</Label>
              <Select
                value={status}
                onValueChange={(value: TaskStatus) => {
                  setStatus(value);
                  handleUpdate('status', value);
                }}
              >
                <SelectTrigger data-testid="select-task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">{t('status.TODO')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('status.IN_PROGRESS')}</SelectItem>
                  <SelectItem value="DONE">{t('status.DONE')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('task.priority')}</Label>
              <Select
                value={priority}
                onValueChange={(value: TaskPriority) => {
                  setPriority(value);
                  handleUpdate('priority', value);
                }}
              >
                <SelectTrigger data-testid="select-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t('priority.LOW')}</SelectItem>
                  <SelectItem value="MEDIUM">{t('priority.MEDIUM')}</SelectItem>
                  <SelectItem value="HIGH">{t('priority.HIGH')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('task.dueDate')}</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                handleUpdate('dueDate', e.target.value || null);
              }}
              data-testid="input-task-due-date"
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>{t('task.subtasks')}</Label>
            {subtasks && subtasks.length > 0 ? (
              <div className="space-y-2">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2">
                    <Checkbox checked={subtask.status === 'DONE'} />
                    <span className="text-sm">{subtask.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t('task.noSubtasks')}</div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder={t('task.addSubtask')}
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                data-testid="input-add-subtask"
              />
              <Button onClick={handleAddSubtask} size="sm">
                {t('common.create')}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>{t('task.comments')}</Label>
            {comments && comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      {comment.author?.name} • {format(new Date(comment.createdAt), 'MMM d, HH:mm')}
                    </div>
                    <div className="text-sm">{comment.body}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t('task.noComments')}</div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder={t('task.addComment')}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-20"
                data-testid="textarea-add-comment"
              />
            </div>
            <Button onClick={handleAddComment} size="sm" className="w-full">
              {t('common.create')}
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>File Attachments</Label>
            {task && <FileAttachments taskId={task.id} />}
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>{t('activity.title')}</Label>
            {task && <TaskActivityTimeline taskId={task.id} />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
