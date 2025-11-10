import { useTranslation } from 'react-i18next';
import { Inbox, Zap } from 'lucide-react';
import { InboxTaskList } from '@/components/InboxTaskList';

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto page-enter">
      {/* Compact Inbox Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
              <Inbox className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-primary rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">
              {t('sidebar.inbox')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Quick capture • Organize later
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-secondary/50 border border-border/50 self-start sm:self-auto">
          <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Ready to capture</span>
        </div>
      </div>

      <InboxTaskList />
    </div>
  );
}
