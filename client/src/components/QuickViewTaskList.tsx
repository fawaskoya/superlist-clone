import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { TaskItem } from './TaskItem';
import type { Task } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { TaskDetailsDrawer } from './TaskDetailsDrawer';

interface QuickViewTaskListProps {
  workspaceId: string;
  view: 'today' | 'upcoming' | 'assigned';
}

export function QuickViewTaskList({ workspaceId, view }: QuickViewTaskListProps) {
  const { t } = useTranslation();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', workspaceId, 'tasks', view],
    enabled: !!workspaceId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const sortedTasks = tasks || [];

  return (
    <>
      <Card className="overflow-hidden">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground text-sm">{t('task.noTasks')}</div>
          </div>
        ) : (
          <div>
            {sortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onSelect={setSelectedTask}
              />
            ))}
          </div>
        )}
      </Card>

      {selectedTask && (
        <TaskDetailsDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          listId={selectedTask.listId}
        />
      )}
    </>
  );
}
