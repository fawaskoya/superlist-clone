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

interface TaskItemProps {
  task: Task & { assignedTo?: { name: string } };
  onSelect: (task: Task) => void;
}

export function TaskItem({ task, onSelect }: TaskItemProps) {
  const { t } = useTranslation();
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
      queryClient.invalidateQueries({ queryKey: ['/api/lists', task.listId, 'tasks'] });
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover-elevate cursor-pointer ${
        isDone ? 'opacity-60' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onSelect(task)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`task-item-${task.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Checkbox
        checked={isDone}
        onCheckedChange={handleCheckboxChange}
        onClick={(e) => e.stopPropagation()}
        className="h-5 w-5 rounded-md"
        data-testid={`checkbox-task-${task.id}`}
      />

      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm truncate ${isDone ? 'line-through' : ''}`}>
          {task.title}
        </div>
        {task.description && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {task.description}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {task.priority !== 'MEDIUM' && (
            <Badge variant="outline" className="h-5 text-xs gap-1 px-1.5">
              <Flag className={`h-3 w-3 ${priorityColors[task.priority]}`} />
              <span className="text-muted-foreground">{t(`priority.${task.priority}`)}</span>
            </Badge>
          )}
          {task.dueDate && (
            <Badge
              variant="outline"
              className={`h-5 text-xs gap-1 px-1.5 ${
                isOverdue
                  ? 'border-destructive text-destructive'
                  : isDueToday
                  ? 'border-primary text-primary'
                  : ''
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.dueDate), 'MMM d')}</span>
            </Badge>
          )}
          {task.assignedTo && (
            <Badge variant="outline" className="h-5 text-xs gap-1 px-1.5">
              <User className="h-3 w-3" />
              <span className="text-muted-foreground">{task.assignedTo.name}</span>
            </Badge>
          )}
        </div>
      </div>

      {task.assignedTo && (
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px]">
            {task.assignedTo.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
