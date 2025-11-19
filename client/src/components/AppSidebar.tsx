import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';
import { Inbox, Calendar, Clock, User, List, Plus, ListCheck, Settings, Sun, BarChart3, MessageCircle, Shield } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const { user } = useAuth();
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
      { title: t('sidebar.myDay', { defaultValue: 'My Day' }), icon: Sun, path: '/my-day', testId: 'link-my-day' },
      { title: t('sidebar.today'), icon: Calendar, path: '/today', testId: 'link-today' },
      { title: t('sidebar.tasks', { defaultValue: 'Tasks' }), icon: ListCheck, path: '/tasks', testId: 'link-tasks' },
      { title: t('sidebar.calendar', { defaultValue: 'Calendar' }), icon: Calendar, path: '/calendar', testId: 'link-calendar' },
      { title: t('sidebar.upcoming'), icon: Clock, path: '/upcoming', testId: 'link-upcoming' },
      { title: t('sidebar.assignedToMe'), icon: User, path: '/assigned', testId: 'link-assigned' },
      { title: t('sidebar.analytics', { defaultValue: 'Analytics' }), icon: BarChart3, path: '/analytics', testId: 'link-analytics' },
      { title: t('sidebar.chat', { defaultValue: 'Chat' }), icon: MessageCircle, path: '/chat', testId: 'link-chat' },
      ...(user?.isAdmin ? [{ title: 'Admin', icon: Shield, path: '/admin', testId: 'link-admin' }] : []),
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
                      'relative h-9 px-3 rounded-md transition-all duration-200 group',
                      location === item.path
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                    data-testid={item.testId}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link href={item.path} className="flex items-center gap-3 py-1">
                      <div className="relative flex items-center justify-center">
                        <item.icon className={cn(
                          "h-[18px] w-[18px] transition-all duration-300 relative z-10",
                          location === item.path
                            ? "text-primary"
                            : hoveredItem === item.path
                            ? "text-foreground scale-110"
                            : "text-muted-foreground"
                        )} />
                      </div>
                      <span className={cn(
                        "text-sm font-medium transition-all duration-200",
                        location === item.path 
                          ? "text-foreground font-semibold" 
                          : "text-muted-foreground group-hover:text-foreground"
                      )}>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-2 px-2">
           <div className="h-px bg-border/40 w-full" />
        </div>

        <SidebarGroup>
          <div className="flex items-center justify-between mb-1 px-2 group/header cursor-pointer" onClick={() => setDialogOpen(true)}>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 tracking-wider uppercase group-hover/header:text-primary transition-colors">
              {t('sidebar.lists')}
            </SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover/header:opacity-100 transition-opacity duration-200"
              data-testid="button-create-list"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {lists?.map((list) => (
                <SidebarMenuItem key={list.id}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      'relative h-9 px-3 rounded-md transition-all duration-200 group',
                      location === `/list/${list.id}`
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                    data-testid={`link-list-${list.id}`}
                  >
                    <Link href={`/list/${list.id}`} className="flex items-center gap-3">
                      <List className={cn(
                        "h-4 w-4 transition-colors",
                         location === `/list/${list.id}` ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                      )} />
                      <span className="truncate text-sm">{list.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        <div className="my-2 px-2">
           <div className="h-px bg-border/40 w-full" />
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'relative h-9 px-3 rounded-md transition-all duration-200 group',
                      location === '/settings'
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                  data-testid="link-settings"
                >
                  <Link href="/settings" className="flex items-center gap-3">
                    <Settings className={cn(
                      "h-4 w-4 transition-colors",
                        location === '/settings' ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                    )} />
                    <span className="text-sm font-medium">{t('sidebar.settings')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-xl p-3 border border-primary/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-md">
               <span className="text-xs font-bold">PRO</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">Upgrade to Pro</div>
              <div className="text-[10px] text-muted-foreground truncate">Unlock all features</div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full h-7 text-xs font-medium bg-background/50 hover:bg-background/80 border shadow-sm"
            onClick={() => window.open('https://superlist.com', '_blank')}
          >
            Upgrade
          </Button>
        </div>
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
