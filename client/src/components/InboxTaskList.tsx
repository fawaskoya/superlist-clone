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
      {/* Beautiful Add Task Card - Matching Homepage Design */}
      <Card className="relative overflow-hidden border border-border/50 bg-gradient-to-br from-card via-card/50 to-card/80 backdrop-blur-xl hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 mb-4 sm:mb-6 group">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Floating background elements */}
        <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16 animate-float-subtle" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-purple-500/5 to-transparent rounded-full translate-y-8 -translate-x-8 animate-float-subtle" style={{ animationDelay: '1s' }} />

        {/* Enhanced input section with homepage styling */}
        <div className="relative px-6 py-6">
          <div className="flex gap-4 items-start">
            {/* Beautiful bullet point with gradient */}
            <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-primary/25 mt-1">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white animate-pulse"></div>
            </div>

            {/* Enhanced input field */}
            <div className="flex-1 w-full relative group">
              <Input
                placeholder="Add a task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleAddTask}
                className="border-0 shadow-none focus-visible:ring-0 px-0 py-3 text-base placeholder:text-muted-foreground/80 bg-transparent font-medium focus:placeholder:text-primary transition-colors"
                data-testid="input-add-task"
                data-inbox-add-task
              />
              {/* Animated underline */}
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-purple-600 group-focus-within:w-full transition-all duration-300" />

              {/* Hint text with enhanced styling */}
              {!newTaskTitle && (
                <div className="absolute left-0 top-full mt-2 text-xs text-foreground/70 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary/70" />
                  <span>Type your task and press Enter</span>
                </div>
              )}
            </div>

            {/* Beautiful Add button matching homepage style */}
            <Button
              size="lg"
              onClick={handleAddTaskClick}
              disabled={!newTaskTitle.trim() || createMutation.isPending}
              className={`bg-gradient-to-r from-primary via-purple-600 to-pink-500 hover:from-primary/90 hover:via-purple-500 hover:to-pink-400 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 transform hover:scale-105 px-6 py-3 h-auto font-semibold rounded-xl ${
                newTaskTitle.trim() ? 'opacity-100' : 'opacity-60'
              }`}
              data-testid="button-add-task"
            >
              {createMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Adding...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
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
