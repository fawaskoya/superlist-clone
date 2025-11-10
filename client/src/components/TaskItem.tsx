import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Flag, User, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Task, TaskPriority, TaskStatus } from '@shared/schema';
import { format, isPast, isToday } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface TaskItemProps {
  task: Task & { assignedTo?: { name: string } };
  onSelect: (task: Task) => void;
}

export function TaskItem({ task, onSelect }: TaskItemProps) {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const updateMutation = useMutation({
    mutationFn: (status: TaskStatus) =>
      apiRequest('PATCH', `/api/tasks/${task.id}`, { status }),
    onSuccess: () => {
      // Invalidate the correct query based on whether task is in a list or inbox
      if (task.listId) {
        queryClient.invalidateQueries({ queryKey: ['/api/lists', task.listId, 'tasks'] });
      } else {
        // Task is in inbox
        queryClient.invalidateQueries({ queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'inbox'] });
        queryClient.invalidateQueries({ queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'all'] });
      }
    },
  });

  const handleCheckboxChange = (checked: boolean) => {
    updateMutation.mutate(checked ? 'DONE' : 'TODO');
  };

  const priorityColors: Record<TaskPriority, string> = {
    LOW: 'text-blue-600 dark:text-blue-400',
    MEDIUM: 'text-orange-600 dark:text-orange-400',
    HIGH: 'text-red-600 dark:text-red-400',
  };

  const isDone = task.status === 'DONE';
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isDone;
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  // Priority-based styling
  const getPriorityStyles = () => {
    switch (task.priority) {
      case 'HIGH':
        return {
          border: 'border-l-red-500',
          background: 'bg-gradient-to-r from-red-50/30 to-transparent dark:from-red-950/10',
          accent: 'shadow-red-500/10',
          indicator: 'bg-red-500'
        };
      case 'MEDIUM':
        return {
          border: 'border-l-orange-500',
          background: 'bg-gradient-to-r from-orange-50/30 to-transparent dark:from-orange-950/10',
          accent: 'shadow-orange-500/10',
          indicator: 'bg-orange-500'
        };
      case 'LOW':
        return {
          border: 'border-l-blue-500',
          background: 'bg-gradient-to-r from-blue-50/30 to-transparent dark:from-blue-950/10',
          accent: 'shadow-blue-500/10',
          indicator: 'bg-blue-500'
        };
      default:
        return {
          border: 'border-l-gray-500',
          background: 'bg-gradient-to-r from-gray-50/30 to-transparent dark:from-gray-950/10',
          accent: 'shadow-gray-500/10',
          indicator: 'bg-gray-500'
        };
    }
  };

  const priorityStyles = getPriorityStyles();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden border-l-4 ${priorityStyles.border} border-t border-r border-b border-border/50 ${priorityStyles.background} backdrop-blur-sm hover:shadow-xl hover:${priorityStyles.accent} transition-all duration-300 hover:-translate-y-0.5 cursor-pointer rounded-lg mx-1 my-1 ${
        isDone ? 'opacity-60' : ''
      } ${isDragging ? 'opacity-50 shadow-2xl' : ''} ${isOverdue ? 'ring-1 ring-red-200/50 dark:ring-red-800/50' : ''}`}
      onClick={() => onSelect(task)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`task-item-${task.id}`}
    >
      {/* Gradient overlay for hover effect */}
      <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${
        isOverdue ? 'from-red-500/20 to-red-500/10' : 'from-primary/20 to-purple-500/10'
      }`} />

      <div className="relative flex items-center gap-4 p-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <Checkbox
          checked={isDone}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          className="h-5 w-5 rounded-md border-2 hover:border-primary/50 transition-colors"
          data-testid={`checkbox-task-${task.id}`}
        />

        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm leading-tight ${isDone ? 'line-through text-muted-foreground' : 'text-foreground group-hover:text-primary transition-colors duration-300'}`}>
            {task.title}
          </div>
          {task.description && (
            <div className="text-xs text-muted-foreground truncate mt-1 leading-relaxed">
              {task.description}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              variant="secondary"
              className={`h-5 text-xs gap-1 px-2 py-0.5 font-medium transition-all duration-300 ${
                task.priority === 'HIGH'
                  ? 'bg-red-100/80 text-red-700 border-red-200/50 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/50'
                  : task.priority === 'MEDIUM'
                  ? 'bg-orange-100/80 text-orange-700 border-orange-200/50 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/50'
                  : 'bg-blue-100/80 text-blue-700 border-blue-200/50 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${priorityStyles.indicator} mr-1`} />
              <Flag className={`h-3 w-3 ${priorityColors[task.priority]}`} />
              <span>{t(`priority.${task.priority}`)}</span>
            </Badge>
            {task.dueDate && (
              <Badge
                variant="secondary"
                className={`h-5 text-xs gap-1 px-2 py-0.5 font-medium transition-all duration-300 ${
                  isOverdue
                    ? 'bg-red-100/80 text-red-700 border-red-200/50 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/50'
                    : isDueToday
                    ? 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/5 dark:border-primary/20'
                    : 'bg-muted/50 text-muted-foreground border-border/50'
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(task.dueDate), 'MMM d')}</span>
              </Badge>
            )}
            {task.assignedTo && (
              <Badge
                variant="secondary"
                className="h-5 text-xs gap-1 px-2 py-0.5 font-medium bg-purple-100/80 text-purple-700 border-purple-200/50 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/50"
              >
                <User className="h-3 w-3" />
                <span>{task.assignedTo.name}</span>
              </Badge>
            )}
          </div>
        </div>

        {task.assignedTo && (
          <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
              <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary to-purple-600 text-white">
                {task.assignedTo.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </div>
  );
}
