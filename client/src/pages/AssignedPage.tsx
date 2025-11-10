import { useTranslation } from 'react-i18next';
import { User, UserCheck, AtSign, Target } from 'lucide-react';
import { QuickViewTaskList } from '@/components/QuickViewTaskList';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function AssignedPage() {
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
      {/* Creative Assigned Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/10 border border-green-200/50 dark:border-green-800/30 flex items-center justify-center">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">
              {t('sidebar.assignedToMe')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tasks assigned to you
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-green/10 border border-green-200/30 dark:border-green-800/20">
            <AtSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-muted-foreground">Assigned</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-emerald/10 border border-emerald-200/30 dark:border-emerald-800/20">
            <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-muted-foreground">Yours</span>
          </div>
        </div>
      </div>

      <QuickViewTaskList workspaceId={currentWorkspace.id} view="assigned" />
    </div>
  );
}
