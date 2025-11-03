import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { Clock, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  type: string;
  metadata: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TaskActivityTimelineProps {
  taskId: string;
}

export function TaskActivityTimeline({ taskId }: TaskActivityTimelineProps) {
  const { t } = useTranslation();

  const { data: activities, isLoading } = useQuery<TaskActivity[]>({
    queryKey: ['/api/tasks', taskId, 'activities'],
  });

  const getActivityMessage = (activity: TaskActivity) => {
    let metadata: any = {};
    try {
      metadata = activity.metadata ? JSON.parse(activity.metadata) : {};
    } catch (e) {
      // Ignore parse errors
    }

    const translationKey = `activity.${activity.type}`;
    
    switch (activity.type) {
      case 'TASK_ASSIGNED':
      case 'TASK_UNASSIGNED':
        return t(translationKey, { name: metadata.relatedName });
      case 'TASK_STATUS_CHANGED':
      case 'TASK_PRIORITY_CHANGED':
      case 'TASK_MOVED':
        return t(translationKey, {
          oldValue: metadata.oldValue,
          newValue: metadata.newValue,
        });
      case 'TAG_ADDED':
      case 'TAG_REMOVED':
        return t(translationKey, { name: metadata.relatedName });
      default:
        return t(translationKey);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8" data-testid="loading-activity">
        <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="no-activity">
        <Clock className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">{t('activity.noActivity')}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4" data-testid="activity-timeline">
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex gap-3 relative"
            data-testid={`activity-item-${index}`}
          >
            {/* Timeline Line */}
            {index !== activities.length - 1 && (
              <div className="absolute top-10 left-4 bottom-0 w-px bg-border" />
            )}

            {/* Avatar */}
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {activity.user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Activity Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-medium" data-testid={`activity-user-${index}`}>
                  {activity.user.name}
                </span>
                <span className="text-sm text-muted-foreground" data-testid={`activity-message-${index}`}>
                  {getActivityMessage(activity)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground" data-testid={`activity-time-${index}`}>
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
