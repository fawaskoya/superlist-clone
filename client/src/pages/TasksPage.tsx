import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/ui/card';
import { TaskItem } from '@/components/TaskItem';
import { TaskDetailsDrawer } from '@/components/TaskDetailsDrawer';
import type { Task } from '@shared/schema';
import { isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Plus } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useLocation } from 'wouter';

export default function TasksPage() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [, setLocation] = useLocation();
  const { setOpenMobile } = useSidebar();
  const [sortOption, setSortOption] = useState<'createdAt' | 'dueDate' | 'priority'>('createdAt');

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

  const groupedTasks = groupTasksByDate(
    useMemo(() => {
      if (!tasks) return [];
      const sorted = [...tasks];
      if (sortOption === 'priority') {
        const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        sorted.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
      } else if (sortOption === 'dueDate') {
        sorted.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      } else {
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return sorted;
    }, [tasks, sortOption])
  );

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
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="flex flex-col gap-4">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full px-4 py-2 text-xs uppercase tracking-wide">
                  {t('tasks.badge', { defaultValue: 'Tasks for me' })}
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {t('tasks.title', { defaultValue: 'Tasks' })}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {t('tasks.subtitleLabel', {
                      defaultValue: 'View, sort, and access all of your tasks in one place.',
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full px-4">
                    {t(`tasks.sort.${sortOption}`, {
                      defaultValue:
                        sortOption === 'createdAt'
                          ? 'Creation date'
                          : sortOption === 'dueDate'
                          ? 'Due date'
                          : 'Priority',
                    })}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => setSortOption('createdAt')} className="cursor-pointer">
                    {t('tasks.sort.createdAt', { defaultValue: 'Creation date' })}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSortOption('dueDate')} className="cursor-pointer">
                    {t('tasks.sort.dueDate', { defaultValue: 'Due date' })}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSortOption('priority')} className="cursor-pointer">
                    {t('tasks.sort.priority', { defaultValue: 'Priority' })}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                className="gap-2 rounded-full px-4"
                onClick={() => {
                  setLocation('/dashboard');
                  setOpenMobile(false);
                  setTimeout(() => {
                    const inboxInput = document.querySelector<HTMLInputElement>('[data-inbox-add-task]');
                    inboxInput?.focus();
                  }, 300);
                }}
              >
                <Plus className="h-4 w-4" />
                {t('tasks.newTask', { defaultValue: 'New task' })}
              </Button>
            </div>
          </header>
        </div>

        {tasks && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground text-sm">{t('task.noTasks')}</div>
          </div>
        ) : (
          <div className="space-y-6 rounded-2xl border border-border/40 bg-background/40 p-4 md:p-6 shadow-sm">
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
