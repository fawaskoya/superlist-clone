import { useTranslation } from 'react-i18next';
import { Calendar, Sun, Clock, CheckCircle } from 'lucide-react';
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
    <div className="max-w-5xl mx-auto page-enter">
      {/* Creative Today Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-100 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/10 border border-orange-200/50 dark:border-orange-800/30 flex items-center justify-center">
              <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">
              {t('sidebar.today')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Focus on today's priorities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-orange/10 border border-orange-200/30 dark:border-orange-800/20">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium text-muted-foreground">Today</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-green/10 border border-green-200/30 dark:border-green-800/20">
            <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-muted-foreground">Complete</span>
          </div>
        </div>
      </div>

      <QuickViewTaskList workspaceId={currentWorkspace.id} view="today" />
    </div>
  );
}
