import { useTranslation } from 'react-i18next';
import { InboxTaskList } from '@/components/InboxTaskList';

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">{t('sidebar.inbox')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('inbox.description', { defaultValue: 'Capture tasks quickly. Organize them later.' })}
        </p>
      </div>
      <InboxTaskList />
    </div>
  );
}
