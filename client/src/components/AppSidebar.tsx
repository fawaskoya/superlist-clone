import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';
import { Inbox, Calendar, Clock, User, List, Plus } from 'lucide-react';
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
import { useQuery } from '@tanstack/react-query';
import type { List as ListType, Workspace } from '@shared/schema';

export function AppSidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();

  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ['/api/workspaces'],
  });

  const currentWorkspaceId = workspaces?.[0]?.id;

  const { data: lists } = useQuery<ListType[]>({
    queryKey: ['/api/workspaces', currentWorkspaceId, 'lists'],
    enabled: !!currentWorkspaceId,
  });

  const quickViews = [
    { title: t('sidebar.inbox'), icon: Inbox, path: '/', testId: 'link-inbox' },
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
      </SidebarContent>
    </Sidebar>
  );
}
