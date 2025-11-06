import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/ui/card';
import { TaskItem } from '@/components/TaskItem';
import { TaskDetailsDrawer } from '@/components/TaskDetailsDrawer';
import type { Task } from '@shared/schema';
import { isToday, isTomorrow, isPast, isFuture, format } from 'date-fns';

export default function TasksPage() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'all'],
    enabled: !!currentWorkspace?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  // Group tasks by due date
  const groupTasksByDate = (tasks: Task[]) => {
    const grouped: Record<string, Task[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      upcoming: [],
      noDueDate: [],
    };

    tasks?.forEach((task) => {
      if (!task.dueDate) {
        grouped.noDueDate.push(task);
      } else {
        const dueDate = new Date(task.dueDate);
        if (isPast(dueDate) && !isToday(dueDate) && task.status !== 'DONE') {
          grouped.overdue.push(task);
        } else if (isToday(dueDate)) {
          grouped.today.push(task);
        } else if (isTomorrow(dueDate)) {
          grouped.tomorrow.push(task);
        } else if (isFuture(dueDate)) {
          grouped.upcoming.push(task);
        }
      }
    });

    return grouped;
  };

  const groupedTasks = groupTasksByDate(tasks || []);

  const renderTaskGroup = (title: string, tasks: Task[], icon?: string) => {
    if (tasks.length === 0) return null;

    return (
      <div key={title} className="mb-6" data-testid={`task-group-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
          {icon && <span className="mr-2">{icon}</span>}
          {title} ({tasks.length})
        </h2>
        <Card className="overflow-hidden">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onSelect={setSelectedTask} />
          ))}
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-5xl mx-auto px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">{t('tasks.title', { defaultValue: 'Tasks' })}</h1>
          <p className="text-sm text-muted-foreground">
            {t('tasks.description', { defaultValue: 'All your tasks across all lists, organized by due date.' })}
          </p>
        </div>

        {tasks && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground text-sm">{t('task.noTasks')}</div>
          </div>
        ) : (
          <div className="space-y-6">
            {renderTaskGroup(t('tasks.overdue', { defaultValue: 'Overdue' }), groupedTasks.overdue, '⚠️')}
            {renderTaskGroup(t('tasks.today', { defaultValue: 'Today' }), groupedTasks.today, '📅')}
            {renderTaskGroup(t('tasks.tomorrow', { defaultValue: 'Tomorrow' }), groupedTasks.tomorrow, '➡️')}
            {renderTaskGroup(t('tasks.upcoming', { defaultValue: 'Upcoming' }), groupedTasks.upcoming, '📆')}
            {renderTaskGroup(t('tasks.noDueDate', { defaultValue: 'No due date' }), groupedTasks.noDueDate)}
          </div>
        )}
      </div>

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
