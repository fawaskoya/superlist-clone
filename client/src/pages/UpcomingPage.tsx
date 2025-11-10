import { useTranslation } from 'react-i18next';
import { Clock, CalendarDays, ArrowRight, Timer } from 'lucide-react';
import { QuickViewTaskList } from '@/components/QuickViewTaskList';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function UpcomingPage() {
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
      {/* Creative Upcoming Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200/50 dark:border-blue-800/30 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">
              {t('sidebar.upcoming')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Plan ahead for future tasks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-blue/10 border border-blue-200/30 dark:border-blue-800/20">
            <Timer className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">Future</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-purple/10 border border-purple-200/30 dark:border-purple-800/20">
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-muted-foreground">Ahead</span>
          </div>
        </div>
      </div>

      <QuickViewTaskList workspaceId={currentWorkspace.id} view="upcoming" />
    </div>
  );
}
