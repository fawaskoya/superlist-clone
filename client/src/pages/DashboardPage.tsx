import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { TaskList } from '@/components/TaskList';
import type { List, Workspace } from '@shared/schema';
import { Inbox } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ['/api/workspaces'],
  });

  const currentWorkspaceId = workspaces?.[0]?.id;

  const { data: lists, isLoading } = useQuery<List[]>({
    queryKey: ['/api/workspaces', currentWorkspaceId, 'lists'],
    enabled: !!currentWorkspaceId,
  });

  const inboxList = lists?.find((list) => list.name === 'Inbox');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!inboxList) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t('sidebar.inbox')}</h2>
        <p className="text-muted-foreground">{t('task.noTasks')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">{t('sidebar.inbox')}</h1>
        <p className="text-sm text-muted-foreground">
          {inboxList.description || 'Your default task list'}
        </p>
      </div>
      <TaskList listId={inboxList.id} />
    </div>
  );
}
