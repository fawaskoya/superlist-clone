import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { TaskItem } from './TaskItem';
import { TaskDetailsDrawer } from './TaskDetailsDrawer';
import type { Task } from '@shared/schema';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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

interface TaskListProps {
  listId: string;
}

export function TaskList({ listId }: TaskListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/lists', listId, 'tasks'],
    enabled: !!listId,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      apiRequest('POST', `/api/lists/${listId}/tasks`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lists', listId, 'tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/lists', listId, 'tasks'] });
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedTasks.findIndex((task) => task.id === active.id);
    const newIndex = sortedTasks.findIndex((task) => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update the UI
    const reorderedTasks = arrayMove(sortedTasks, oldIndex, newIndex);
    queryClient.setQueryData(['/api/lists', listId, 'tasks'], reorderedTasks);

    // Update the server
    reorderMutation.mutate({
      taskId: active.id as string,
      newIndex: newIndex,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const sortedTasks = tasks?.sort((a, b) => a.orderIndex - b.orderIndex) || [];

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Plus className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t('task.addTask')}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleAddTask}
            className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
            data-testid="input-add-task"
          />
        </div>
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground text-sm">{t('task.noTasks')}</div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedTasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {sortedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onSelect={setSelectedTask}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>

      <TaskDetailsDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        listId={listId}
      />
    </>
  );
}
