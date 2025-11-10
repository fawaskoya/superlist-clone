import { useMemo, useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
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
import { useLocation } from 'wouter';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class TasksErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TasksPage Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="text-muted-foreground">
              The tasks page encountered an error. Check the console for details.
            </p>
            <div className="text-left bg-red-50 dark:bg-red-900/20 p-4 rounded-lg max-w-2xl">
              <h3 className="font-semibold mb-2">Error Details:</h3>
              <pre className="text-sm overflow-auto">
                {this.state.error?.toString()}
              </pre>
              {this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold">Component Stack</summary>
                  <pre className="text-sm mt-2 overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface TaskGroupProps {
  title: string;
  tasks: Task[];
  icon?: string;
  onSelect: (task: Task) => void;
}

function TaskGroup({ title, tasks, icon, onSelect }: TaskGroupProps) {
  console.log(`TaskGroup: Rendering ${title} with ${tasks.length} tasks`);

  const { t } = useTranslation();

  if (tasks.length === 0) {
    console.log(`TaskGroup: ${title} has no tasks, returning null`);
    return null;
  }

  console.log(`TaskGroup: Rendering ${tasks.length} tasks for ${title}`);

  return (
    <div key={title} className="mb-6" data-testid={`task-group-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
        {icon && <span className="mr-2">{icon}</span>}
        {title} ({tasks.length})
      </h2>
      <Card className="overflow-hidden">
        {tasks.map((task) => {
          console.log(`TaskGroup: Rendering task ${task.id} in ${title}`);
          return <TaskItem key={task.id} task={task} onSelect={() => {}} />;
        })}
      </Card>
    </div>
  );
}

function TasksPageContent() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [, setLocation] = useLocation();
  const [sortOption, setSortOption] = useState<'createdAt' | 'dueDate' | 'priority'>('createdAt');

  console.log('TasksPage: Rendering with currentWorkspace:', currentWorkspace?.id);

  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'all'],
    enabled: !!currentWorkspace?.id,
  });

  console.log('TasksPage: Query result - isLoading:', isLoading, 'tasks length:', tasks?.length, 'error:', error);

  useEffect(() => {
    console.log('TasksPage: Component mounted/updated');
    return () => console.log('TasksPage: Component unmounting');
  }, []);

  useEffect(() => {
    console.log('TasksPage: selectedTask changed:', selectedTask?.id);
  }, [selectedTask]);

  useEffect(() => {
    console.log('TasksPage: currentWorkspace changed:', currentWorkspace?.id);
  }, [currentWorkspace]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const groupedTasks = useMemo(() => {
    console.log('useMemo: Computing groupedTasks with tasks:', tasks?.length, 'sortOption:', sortOption);

    if (!tasks) {
      console.log('useMemo: No tasks, returning empty groups');
      return {
        overdue: [],
        today: [],
        tomorrow: [],
        upcoming: [],
        noDueDate: [],
      };
    }

    try {
      // Sort tasks first
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

      console.log('useMemo: Tasks sorted, now grouping');

      // Group tasks by due date
      const grouped: Record<string, Task[]> = {
        overdue: [],
        today: [],
        tomorrow: [],
        upcoming: [],
        noDueDate: [],
      };

      sorted.forEach((task) => {
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

      console.log('useMemo: Grouping complete:', {
        overdue: grouped.overdue.length,
        today: grouped.today.length,
        tomorrow: grouped.tomorrow.length,
        upcoming: grouped.upcoming.length,
        noDueDate: grouped.noDueDate.length
      });

      return grouped;
    } catch (error) {
      console.error('useMemo: Error in groupedTasks computation:', error);
      return {
        overdue: [],
        today: [],
        tomorrow: [],
        upcoming: [],
        noDueDate: [],
      };
    }
  }, [tasks, sortOption]);


  console.log('TasksPage: Starting render with groupedTasks:', Object.keys(groupedTasks));

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
            <TaskGroup
              title={t('tasks.overdue', { defaultValue: 'Overdue' })}
              tasks={groupedTasks.overdue}
              icon="⚠️"
              onSelect={setSelectedTask}
            />
            <TaskGroup
              title={t('tasks.today', { defaultValue: 'Today' })}
              tasks={groupedTasks.today}
              icon="📅"
              onSelect={setSelectedTask}
            />
            <TaskGroup
              title={t('tasks.tomorrow', { defaultValue: 'Tomorrow' })}
              tasks={groupedTasks.tomorrow}
              icon="➡️"
              onSelect={setSelectedTask}
            />
            <TaskGroup
              title={t('tasks.upcoming', { defaultValue: 'Upcoming' })}
              tasks={groupedTasks.upcoming}
              icon="📆"
              onSelect={setSelectedTask}
            />
            <TaskGroup
              title={t('tasks.noDueDate', { defaultValue: 'No due date' })}
              tasks={groupedTasks.noDueDate}
              onSelect={setSelectedTask}
            />
          </div>
        )}
      </div>

      {/* Temporarily commented out to debug React error #300 */}
      {/* {selectedTask && (
        <TaskDetailsDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          listId={selectedTask.listId}
        />
      )} */}
    </>
  );
}

export default function TasksPage() {
  console.log('TasksPage: Error boundary wrapper rendering');
  return (
    <TasksErrorBoundary>
      <TasksPageContent />
    </TasksErrorBoundary>
  );
}
