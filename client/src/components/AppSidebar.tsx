import { useState } from 'react';
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

export function AppSidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

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
    { title: t('sidebar.tasks', { defaultValue: 'Tasks' }), icon: ListCheck, path: '/tasks', testId: 'link-tasks' },
    { title: t('sidebar.today'), icon: Calendar, path: '/today', testId: 'link-today' },
    { title: t('sidebar.upcoming'), icon: Clock, path: '/upcoming', testId: 'link-upcoming' },
    { title: t('sidebar.assignedToMe'), icon: User, path: '/assigned', testId: 'link-assigned' },
  ];

  return (
    <Sidebar>
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
            {t('sidebar.myDay')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {quickViews.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    className={`h-9 px-3 ${location === item.path ? 'bg-sidebar-accent' : ''}`}
                    data-testid={item.testId}
                  >
                    <Link href={item.path}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
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
              className="h-6 w-6"
              onClick={() => setDialogOpen(true)}
              data-testid="button-create-list"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {lists?.map((list) => (
                <SidebarMenuItem key={list.id}>
                  <SidebarMenuButton
                    asChild
                    className={`h-9 px-3 ${location === `/list/${list.id}` ? 'bg-sidebar-accent' : ''}`}
                    data-testid={`link-list-${list.id}`}
                  >
                    <Link href={`/list/${list.id}`}>
                      <List className="h-5 w-5" />
                      <span>{list.name}</span>
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
                  className={`h-9 px-3 ${location === '/settings' ? 'bg-sidebar-accent' : ''}`}
                  data-testid="link-settings"
                >
                  <Link href="/settings">
                    <Settings className="h-5 w-5" />
                    <span>{t('sidebar.settings')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

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
