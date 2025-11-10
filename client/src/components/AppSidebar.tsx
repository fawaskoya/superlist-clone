import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';
import { Inbox, Calendar, Clock, User, List, Plus, ListCheck, Settings } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { List as ListType, InsertList } from '@shared/schema';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const { setOpenMobile } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const { data: lists } = useQuery<ListType[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'lists'],
    enabled: !!currentWorkspace?.id,
  });

  const createListMutation = useMutation({
    mutationFn: (data: InsertList) => apiRequest('POST', `/api/workspaces/${currentWorkspace?.id}/lists`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', currentWorkspace?.id, 'lists'] });
      setDialogOpen(false);
      setNewListName('');
      toast({
        title: t('common.success'),
        description: 'List created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message,
      });
    },
  });

  const handleCreateList = () => {
    if (!newListName.trim() || !currentWorkspace) return;
    createListMutation.mutate({
      name: newListName.trim(),
      isPersonal: false,
    });
  };

  const quickViews = [
    { title: t('sidebar.inbox'), icon: Inbox, path: '/dashboard', testId: 'link-inbox' },
    { title: t('sidebar.today'), icon: Calendar, path: '/today', testId: 'link-today' },
    { title: t('sidebar.tasks', { defaultValue: 'Tasks' }), icon: ListCheck, path: '/tasks', testId: 'link-tasks' },
    { title: t('sidebar.upcoming'), icon: Clock, path: '/upcoming', testId: 'link-upcoming' },
    { title: t('sidebar.assignedToMe'), icon: User, path: '/assigned', testId: 'link-assigned' },
  ];

  useEffect(() => {
    // Close mobile sidebar after navigation
    setOpenMobile(false);
  }, [location, setOpenMobile]);

  return (
    <Sidebar>
      <SidebarContent className="p-4 gap-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
            {t('sidebar.myDay')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 stagger-children">
              {quickViews.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      'relative h-11 px-4 rounded-xl transition-all duration-200 group',
                      location === item.path
                        ? 'bg-gradient-accent shadow-sm after:absolute after:right-2 after:top-3 after:bottom-3 after:w-[3px] after:rounded-l-full after:bg-primary'
                        : 'hover:bg-gradient-accent/50 hover:shadow-md hover:scale-105'
                    )}
                    data-testid={item.testId}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link href={item.path} className="flex items-center gap-3">
                      <item.icon className={cn(
                        "h-5 w-5 transition-all duration-200",
                        location === item.path
                          ? "text-primary"
                          : hoveredItem === item.path
                          ? "text-primary scale-110"
                          : "text-primary/70"
                      )} />
                      <span className={cn(
                        "font-medium transition-all duration-200",
                        location === item.path && "text-primary font-semibold"
                      )}>{item.title}</span>
                      {location === item.path && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-primary"></div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-4 border-t border-sidebar-border" />

        <SidebarGroup>
          <div className="flex items-center justify-between mb-2">
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground">
              {t('sidebar.lists')}
            </SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 scale-hover"
              onClick={() => setDialogOpen(true)}
              data-testid="button-create-list"
            >
              <Plus className="h-4 w-4 text-primary icon-interactive" />
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 stagger-children">
              {lists?.map((list) => (
                <SidebarMenuItem key={list.id}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      'relative h-10 px-4 rounded-xl transition-all duration-200 group',
                      location === `/list/${list.id}`
                        ? 'bg-gradient-secondary shadow-sm after:absolute after:right-2 after:top-2 after:bottom-2 after:w-[3px] after:rounded-l-full after:bg-primary'
                        : 'hover:bg-gradient-secondary/50 hover:shadow-md hover:scale-105'
                    )}
                    data-testid={`link-list-${list.id}`}
                    onMouseEnter={() => setHoveredItem(`list-${list.id}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link href={`/list/${list.id}`} className="flex items-center gap-3">
                      <List className={cn(
                        "h-4 w-4 transition-all duration-200",
                        location === `/list/${list.id}`
                          ? "text-primary"
                          : hoveredItem === `list-${list.id}`
                          ? "text-primary scale-110"
                          : "text-primary/70"
                      )} />
                      <span className={cn(
                        "font-medium transition-all duration-200 truncate",
                        location === `/list/${list.id}` && "text-primary font-semibold"
                      )}>{list.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-4 border-t border-sidebar-border" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'relative h-11 px-4 rounded-xl transition-all duration-200 group',
                      location === '/settings'
                        ? 'bg-gradient-accent shadow-sm after:absolute after:right-2 after:top-3 after:bottom-3 after:w-[3px] after:rounded-l-full after:bg-primary'
                        : 'hover:bg-gradient-accent/50 hover:shadow-md hover:scale-105'
                  )}
                  data-testid="link-settings"
                  onMouseEnter={() => setHoveredItem('/settings')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link href="/settings" className="flex items-center gap-3">
                    <Settings className={cn(
                      "h-5 w-5 transition-all duration-200",
                        location === '/settings'
                          ? "text-primary"
                          : hoveredItem === '/settings'
                        ? "text-primary scale-110"
                        : "text-primary/70"
                    )} />
                    <span className={cn(
                      "font-medium transition-all duration-200",
                      location === '/settings' && "text-primary font-semibold"
                    )}>{t('sidebar.settings')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="outline"
          className="w-full h-12 rounded-2xl font-semibold btn-creative scale-hover focus-ring-enhanced shadow-lg border-primary/30 hover:border-primary/50 group"
          onClick={() => window.open('https://superlist.com', '_blank')}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg group-hover:scale-110 transition-transform duration-200">⚡</span>
            <span className="text-foreground font-semibold group-hover:text-foreground/90 transition-colors duration-200">
              Upgrade to Pro
            </span>
          </div>
        </Button>
      </SidebarFooter>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('list.createList')}</DialogTitle>
            <DialogDescription>
              Create a new list to organize your tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">{t('list.listName')}</Label>
              <Input
                id="list-name"
                placeholder="My Tasks"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newListName.trim()) {
                    handleCreateList();
                  }
                }}
                data-testid="input-list-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreateList}
              disabled={createListMutation.isPending || !newListName.trim()}
              data-testid="button-create-list-submit"
            >
              {createListMutation.isPending ? t('common.loading') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
