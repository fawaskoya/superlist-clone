import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { QuickViewTaskList } from '@/components/QuickViewTaskList';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function TodayPage() {
  const { t } = useTranslation();
  const { currentWorkspace, isLoading } = useWorkspace();

  if (isLoading || !currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-6">
      <div className="mb-6">
        <Calendar className="h-8 w-8 text-primary mb-3" />
        <h1 className="text-2xl font-semibold mb-2">{t('sidebar.today')}</h1>
        <p className="text-sm text-muted-foreground">{t('task.dueToday')}</p>
      </div>
      <QuickViewTaskList workspaceId={currentWorkspace.id} view="today" />
    </div>
  );
}
