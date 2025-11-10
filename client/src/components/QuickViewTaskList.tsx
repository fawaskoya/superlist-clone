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
      <Card className="overflow-hidden card-creative">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center mb-4">
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30"></div>
              </div>
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No tasks yet</h3>
            <p className="text-sm text-muted-foreground/70 max-w-xs">
              {view === 'today' && "Great job! All today's tasks are complete."}
              {view === 'upcoming' && "No upcoming tasks scheduled. Add some to stay ahead!"}
              {view === 'assigned' && "No tasks assigned to you currently."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {sortedTasks.map((task, index) => (
              <div
                key={task.id}
                className="animate-in slide-in-from-left-4 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TaskItem
                  task={task}
                  onSelect={setSelectedTask}
                />
              </div>
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
