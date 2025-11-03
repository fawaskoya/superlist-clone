import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';

interface SearchFilters {
  q: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  list: {
    id: string;
    name: string;
  };
}

export function SearchBar() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ q: '' });
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setFilters((prev) => ({ ...prev, q: searchQuery }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build query params
  const queryParams = new URLSearchParams();
  if (filters.q) queryParams.append('q', filters.q);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.priority) queryParams.append('priority', filters.priority);
  if (filters.assignedTo) queryParams.append('assignedTo', filters.assignedTo);

  const { data: searchResults, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'search', queryParams.toString()],
    enabled: !!currentWorkspace && (!!debouncedQuery || !!filters.status || !!filters.priority || !!filters.assignedTo),
  });

  const handleClearFilters = () => {
    setFilters({ q: searchQuery });
  };

  const activeFiltersCount = [filters.status, filters.priority, filters.assignedTo].filter(Boolean).length;

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-900">{part}</mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const handleTaskClick = (task: Task) => {
    setLocation(`/list/${task.list.id}`);
    setShowResults(false);
    setSearchQuery('');
    setFilters({ q: '' });
  };

  return (
    <div className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="input-search"
          type="text"
          placeholder={t('search.placeholder')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchQuery && (
            <Button
              data-testid="button-clear-search"
              size="icon"
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setFilters({ q: '' });
                setShowResults(false);
              }}
              className="h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                data-testid="button-filter"
                size="icon"
                variant={activeFiltersCount > 0 ? "default" : "ghost"}
                className="h-6 w-6 relative"
              >
                <Filter className="h-3 w-3" />
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" data-testid="popover-filters">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{t('search.filters')}</h4>
                  {activeFiltersCount > 0 && (
                    <Button
                      data-testid="button-clear-filters"
                      size="sm"
                      variant="ghost"
                      onClick={handleClearFilters}
                    >
                      {t('search.clearFilters')}
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('task.status')}</label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: value === 'all' ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.allStatuses')}</SelectItem>
                      <SelectItem value="TODO">{t('task.todo')}</SelectItem>
                      <SelectItem value="IN_PROGRESS">{t('task.inProgress')}</SelectItem>
                      <SelectItem value="DONE">{t('task.done')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('task.priority')}</label>
                  <Select
                    value={filters.priority || 'all'}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        priority: value === 'all' ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger data-testid="select-priority-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.allPriorities')}</SelectItem>
                      <SelectItem value="LOW">{t('task.low')}</SelectItem>
                      <SelectItem value="MEDIUM">{t('task.medium')}</SelectItem>
                      <SelectItem value="HIGH">{t('task.high')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {showResults && (debouncedQuery || activeFiltersCount > 0) && (
        <Card
          data-testid="card-search-results"
          className="absolute top-full mt-2 w-full z-50 max-h-96"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ScrollArea className="h-full max-h-96">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t('search.searching')}
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="p-2">
                {searchResults.map((task) => (
                  <button
                    key={task.id}
                    data-testid={`result-task-${task.id}`}
                    onClick={() => handleTaskClick(task)}
                    className="w-full text-left p-3 rounded hover-elevate active-elevate-2 mb-1"
                  >
                    <div className="font-medium">
                      {highlightMatch(task.title, debouncedQuery)}
                    </div>
                    {task.description && (
                      <div className="text-sm text-muted-foreground truncate">
                        {highlightMatch(task.description, debouncedQuery)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {task.list.name}
                      </Badge>
                      <Badge
                        variant={
                          task.status === 'DONE'
                            ? 'default'
                            : task.status === 'IN_PROGRESS'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {t(`status.${task.status}`)}
                      </Badge>
                      {task.priority && (
                        <Badge
                          variant={
                            task.priority === 'HIGH'
                              ? 'destructive'
                              : task.priority === 'MEDIUM'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {t(`priority.${task.priority}`)}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t('search.noResults')}
              </div>
            )}
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
