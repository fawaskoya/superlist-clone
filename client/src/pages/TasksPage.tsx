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
import { ArrowUpRight, Plus, CheckSquare, Calendar } from 'lucide-react';
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
  description?: string;
  onSelect: (task: Task) => void;
}

function TaskGroup({ title, tasks, icon, description, onSelect }: TaskGroupProps) {
  const { t } = useTranslation();

  if (tasks.length === 0) {
    return null;
  }

  const getGroupStyles = (title: string) => {
    switch (title.toLowerCase()) {
      case 'overdue':
        return 'border-l-4 border-l-red-500';
      case 'today':
        return 'border-l-4 border-l-blue-500';
      case 'tomorrow':
        return 'border-l-4 border-l-orange-500';
      case 'upcoming':
        return 'border-l-4 border-l-green-500';
      default:
        return 'border-l-4 border-l-gray-500';
    }
  };

  return (
    <div key={title} className="mb-4 animate-in slide-in-from-bottom-4 duration-500" data-testid={`task-group-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {icon && <span className="text-base sm:text-lg flex-shrink-0">{icon}</span>}
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
              {title}
            </h2>
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{description}</p>
            )}
          </div>
        </div>
        <Badge variant="secondary" className="rounded-full px-2 sm:px-3 py-1 text-xs font-medium scale-hover flex-shrink-0 ml-2">
          {tasks.length}
        </Badge>
      </div>
      <div className={`rounded-lg overflow-hidden ${getGroupStyles(title)}`}>
        <div className="divide-y divide-border/30 bg-card/30">
          {tasks.map((task, index) => {
            return (
              <div
                key={task.id}
                className="animate-in slide-in-from-left-4 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TaskItem task={task} onSelect={onSelect} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TasksPageContent() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [, setLocation] = useLocation();
  const [sortOption, setSortOption] = useState<'createdAt' | 'dueDate' | 'priority'>('createdAt');


  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'all'],
    enabled: !!currentWorkspace?.id,
  });



  const groupedTasks = useMemo(() => {

    if (!tasks) {
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

      return {
        overdue: grouped.overdue,
        today: grouped.today,
        tomorrow: grouped.tomorrow,
        upcoming: grouped.upcoming,
        noDueDate: grouped.noDueDate
      };
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


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 page-enter">
        {/* Compact Tasks Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-primary rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">
                {t('tasks.title', { defaultValue: 'Tasks' })}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                All tasks • Organized view
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full px-3 sm:px-4 py-2 scale-hover focus-ring-enhanced bg-gradient-secondary/50 border-primary/20 w-full sm:w-auto">
                  <span className="flex items-center gap-2 text-xs sm:text-sm">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">
                      {t(`tasks.sort.${sortOption}`, {
                        defaultValue:
                          sortOption === 'createdAt'
                            ? 'Created'
                            : sortOption === 'dueDate'
                            ? 'Due date'
                            : 'Priority',
                      })}
                    </span>
                  </span>
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
              className="gap-2 rounded-full px-3 sm:px-4 py-2 btn-creative scale-hover focus-ring-enhanced w-full sm:w-auto"
              onClick={() => {
                setLocation('/dashboard');
                setTimeout(() => {
                  const inboxInput = document.querySelector<HTMLInputElement>('[data-inbox-add-task]');
                  inboxInput?.focus();
                }, 300);
              }}
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 icon-interactive" />
              <span className="text-sm">{t('tasks.newTask', { defaultValue: 'New task' })}</span>
            </Button>
          </div>
        </div>

        {tasks && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground text-sm">{t('task.noTasks')}</div>
          </div>
        ) : (
          <div className="space-y-4">
            <TaskGroup
              title={t('tasks.overdue', { defaultValue: 'Overdue' })}
              tasks={groupedTasks.overdue}
              icon="⚠️"
              description="Past due tasks"
              onSelect={setSelectedTask}
            />
            <TaskGroup
              title={t('tasks.today', { defaultValue: 'Today' })}
              tasks={groupedTasks.today}
              icon="📅"
              description="Due today"
              onSelect={setSelectedTask}
            />
            <TaskGroup
              title={t('tasks.tomorrow', { defaultValue: 'Tomorrow' })}
              tasks={groupedTasks.tomorrow}
              icon="➡️"
              description="Due tomorrow"
              onSelect={setSelectedTask}
            />
            <TaskGroup
              title={t('tasks.upcoming', { defaultValue: 'Upcoming' })}
              tasks={groupedTasks.upcoming}
              icon="📆"
              description="Future tasks"
              onSelect={setSelectedTask}
            />
            <TaskGroup
              title={t('tasks.noDueDate', { defaultValue: 'No due date' })}
              tasks={groupedTasks.noDueDate}
              icon="📝"
              description="Unscheduled tasks"
              onSelect={setSelectedTask}
            />
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

export default function TasksPage() {
  return (
    <TasksErrorBoundary>
      <TasksPageContent />
    </TasksErrorBoundary>
  );
}
