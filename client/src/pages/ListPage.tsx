import { useTranslation } from 'react-i18next';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { TaskList } from '@/components/TaskList';
import type { List } from '@shared/schema';
import { ListIcon } from 'lucide-react';

export default function ListPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const { data: list, isLoading } = useQuery<List>({
    queryKey: ['/api/lists', id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ListIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">List not found</h2>
        <p className="text-muted-foreground">The list you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">{list.name}</h1>
        {list.description && (
          <p className="text-sm text-muted-foreground">{list.description}</p>
        )}
      </div>
      <TaskList listId={list.id} />
    </div>
  );
}
