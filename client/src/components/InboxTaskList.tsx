import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Sparkles, Lightbulb } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TaskItem } from './TaskItem';
import { TaskDetailsDrawer } from './TaskDetailsDrawer';
import type { Task } from '@shared/schema';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function InboxTaskList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'inbox'],
    enabled: !!currentWorkspace?.id,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      apiRequest('POST', `/api/workspaces/${currentWorkspace?.id}/tasks`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'inbox'] 
      });
      setNewTaskTitle('');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message,
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ taskId, newIndex }: { taskId: string; newIndex: number }) =>
      apiRequest('PATCH', `/api/tasks/${taskId}/reorder`, { orderIndex: newIndex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'inbox'] 
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message,
      });
    },
  });

  const handleAddTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      createMutation.mutate(newTaskTitle.trim());
    }
  };

  const handleAddTaskClick = () => {
    if (newTaskTitle.trim()) {
      createMutation.mutate(newTaskTitle.trim());
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedTasks.findIndex((t) => t.id === active.id);
      const newIndex = sortedTasks.findIndex((t) => t.id === over.id);

      const reorderedTasks = arrayMove(sortedTasks, oldIndex, newIndex);

      queryClient.setQueryData(
        ['/api/workspaces', currentWorkspace?.id, 'tasks', 'inbox'],
        reorderedTasks
      );

      reorderMutation.mutate({
        taskId: active.id as string,
        newIndex: newIndex,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const sortedTasks = tasks?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [];

  return (
    <>
      {/* Mobile-Optimized Add Task Card */}
      <Card className="relative overflow-hidden card-creative mb-4 sm:mb-6">
        {/* Simplified background for mobile */}
        <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-10 translate-x-10 sm:-translate-y-16 sm:translate-x-16"></div>

        {/* Simplified header for mobile */}
        <div className="relative px-4 py-3 sm:px-6 sm:py-4 border-b border-border/50 bg-gradient-to-r from-background/50 to-background/30">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground text-sm truncate">Add a new task</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Press Enter or click Add to create</p>
            </div>
            {/* Hide hint on mobile for cleaner look */}
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Lightbulb className="w-3 h-3" />
              <span>Quick capture</span>
            </div>
          </div>
        </div>

        {/* Mobile-optimized input section */}
        <div className="relative px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex gap-3">
            {/* Simplified bullet point */}
            <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm mt-0.5">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/90"></div>
            </div>

            {/* Input field with enhanced styling */}
            <div className="flex-1 w-full relative">
              <Input
                placeholder="What needs to be done?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleAddTask}
                className="input-enhanced border-0 shadow-none focus-visible:ring-0 px-0 py-2 sm:py-3 text-sm sm:text-base placeholder:text-muted-foreground/60 bg-transparent"
                data-testid="input-add-task"
                data-inbox-add-task
              />
              {/* Hint text - only show on larger screens */}
              {!newTaskTitle && (
                <div className="hidden sm:block absolute left-0 top-full mt-1 text-xs text-muted-foreground/50">
                  💡 Type your task and press Enter
                </div>
              )}
            </div>

            {/* Compact Add button */}
            <Button
              size="sm"
              onClick={handleAddTaskClick}
              disabled={!newTaskTitle.trim() || createMutation.isPending}
              className={`btn-creative scale-hover px-3 sm:px-6 py-2 sm:py-3 h-auto font-medium transition-all duration-200 w-auto ${
                newTaskTitle.trim() ? 'shadow-md hover:shadow-lg' : 'opacity-60'
              }`}
              data-testid="button-add-task"
            >
              {createMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm">Adding...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 icon-interactive" />
                  <span className="text-sm font-medium">Add Task</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </Card>
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground text-sm">{t('task.noTasks')}</div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="card-creative rounded-lg"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TaskItem task={task} onSelect={setSelectedTask} />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

      {selectedTask && (
        <TaskDetailsDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          listId={null}
        />
      )}
    </>
  );
}
