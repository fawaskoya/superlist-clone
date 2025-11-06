import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
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
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Plus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder={t('task.addTask')}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleAddTask}
            className="border-0 shadow-none focus-visible:ring-0 px-0 min-h-10 flex-1"
            data-testid="input-add-task"
          />
          <Button
            size="lg"
            onClick={handleAddTaskClick}
            disabled={!newTaskTitle.trim() || createMutation.isPending}
            data-testid="button-add-task"
          >
            {createMutation.isPending ? t('common.loading') : t('common.add')}
          </Button>
        </div>
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground text-sm">{t('task.noTasks')}</div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {sortedTasks.map((task) => (
                <TaskItem key={task.id} task={task} onSelect={setSelectedTask} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Card>

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
