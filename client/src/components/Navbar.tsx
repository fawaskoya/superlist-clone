import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Settings, Search, Briefcase, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { SearchBar } from './SearchBar';
import { NotificationBell } from './NotificationBell';
import { WorkspaceSettingsDialog } from './WorkspaceSettingsDialog';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLocation } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { hasPermission } = useWorkspace();
  const [, setLocation] = useLocation();
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [customStatusMessage, setCustomStatusMessage] = useState('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isMobile = useIsMobile();

  const canManageWorkspace = hasPermission('MANAGE_WORKSPACE');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user presence
  const { data: userPresence } = useQuery({
    queryKey: ['/api/users/presence', { userIds: user?.id }],
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Sync custom status message with presence data
  useEffect(() => {
    if (userPresence?.customMessage !== undefined) {
      setCustomStatusMessage(userPresence.customMessage || '');
    }
  }, [userPresence?.customMessage]);

  // Update presence mutation
  const updatePresenceMutation = useMutation({
    mutationFn: (data: { status: string; customMessage?: string }) =>
      apiRequest('PUT', '/api/users/presence', data),
    onSuccess: (data) => {
      // Update the local presence data immediately for instant UI feedback
      queryClient.setQueryData(['/api/users/presence', { userIds: user?.id }], data);
      queryClient.invalidateQueries({
        queryKey: ['/api/users/presence']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/organization/users']
      });
      toast({
        title: 'Status updated',
        description: 'Your presence status has been updated',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update presence',
      });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const handleStatusChange = (status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE') => {
    updatePresenceMutation.mutate({ status, customMessage: customStatusMessage });
  };

  const handleStatusMessageChange = useCallback((message: string) => {
    setCustomStatusMessage(message);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced API call
    debounceTimeoutRef.current = setTimeout(() => {
      updatePresenceMutation.mutate({
        status: userPresence?.status || 'ONLINE',
        customMessage: message || undefined
      });
    }, 500);
  }, [userPresence?.status, updatePresenceMutation]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-500';
      case 'AWAY': return 'bg-yellow-500';
      case 'BUSY': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'ONLINE': return 'Available';
      case 'AWAY': return 'Away';
      case 'BUSY': return 'Busy';
      default: return 'Offline';
    }
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  useEffect(() => {
    if (!isMobile) {
      setMobileSearchOpen(false);
      setMobileWorkspaceOpen(false);
    }
  }, [isMobile]);

  return (
    <>
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger
                data-testid="button-sidebar-toggle"
                className="h-9 w-9 rounded-lg hover:bg-accent/50 transition-colors duration-200 group"
              />
              <div className="flex items-center gap-1 sm:gap-2 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-gradient-to-br from-primary to-purple-600 rounded-lg p-1.5 sm:p-2">
                    <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
                <span className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-500 bg-clip-text text-transparent">
                  TaskFlow
                </span>
              </div>
            </div>
            <div className="hidden md:flex">
              <WorkspaceSwitcher />
            </div>
            <div className="hidden lg:flex flex-1 px-4">
              <SearchBar />
            </div>
            <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSearchOpen(true)}
              className="inline-flex h-9 w-9 md:hidden rounded-lg hover:bg-gradient-to-br hover:from-primary/10 hover:to-purple-500/10 transition-all duration-300 group hover:scale-105"
              data-testid="button-mobile-search"
            >
              <Search className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
              <span className="sr-only">{t('search.placeholder')}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileWorkspaceOpen(true)}
              className="inline-flex h-9 w-9 md:hidden rounded-lg hover:bg-gradient-to-br hover:from-primary/10 hover:to-purple-500/10 transition-all duration-300 group hover:scale-105"
              data-testid="button-mobile-workspaces"
            >
              <Briefcase className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
              <span className="sr-only">
                {t('workspace.switchWorkspace', { defaultValue: 'Switch workspace' })}
              </span>
            </Button>
            {canManageWorkspace && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowWorkspaceSettings(true)}
                className="hidden lg:inline-flex h-9 w-9 rounded-lg hover:bg-gradient-to-br hover:from-primary/10 hover:to-purple-500/10 transition-all duration-300 group hover:scale-105"
                data-testid="button-workspace-settings"
              >
                <Settings className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
              </Button>
            )}
            <NotificationBell />
            <div className="hidden sm:inline-flex items-center">
              <ThemeToggle />
            </div>

            {/* Mobile theme toggle */}
            <div className="sm:hidden">
              <ThemeToggle />
            </div>
            <div className="hidden md:inline-flex items-center">
              <LanguageSwitcher />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 rounded-full p-0 hover:bg-gradient-to-br hover:from-primary/10 hover:to-purple-500/10 transition-all duration-300 group relative hover:scale-105"
                  data-testid="button-user-menu"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-200">
                      <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10">{initials}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(userPresence?.status)}`}></div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>

                {/* Presence Status Section */}
                <div className="px-2 py-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Status</div>
                  <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-md">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(userPresence?.status)}`} />
                    <span className="text-sm font-medium">{getStatusText(userPresence?.status)}</span>
                  </div>
                  <div className="space-y-1">
                    <DropdownMenuItem
                      onClick={() => handleStatusChange('ONLINE')}
                      className={`flex items-center gap-2 px-2 py-2 cursor-pointer ${userPresence?.status === 'ONLINE' ? 'bg-accent' : ''}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">Available</span>
                      {userPresence?.status === 'ONLINE' && <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange('AWAY')}
                      className={`flex items-center gap-2 px-2 py-2 cursor-pointer ${userPresence?.status === 'AWAY' ? 'bg-accent' : ''}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-sm">Away</span>
                      {userPresence?.status === 'AWAY' && <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange('BUSY')}
                      className={`flex items-center gap-2 px-2 py-2 cursor-pointer ${userPresence?.status === 'BUSY' ? 'bg-accent' : ''}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm">Busy</span>
                      {userPresence?.status === 'BUSY' && <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange('OFFLINE')}
                      className={`flex items-center gap-2 px-2 py-2 cursor-pointer ${userPresence?.status === 'OFFLINE' ? 'bg-accent' : ''}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-sm">Offline</span>
                      {userPresence?.status === 'OFFLINE' && <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />}
                    </DropdownMenuItem>
                  </div>

                  {/* Custom Status Message */}
                  <div className="pt-2 border-t border-border/50">
                    <Label htmlFor="status-message" className="text-xs text-muted-foreground mb-1 block">
                      What's your status?
                    </Label>
                    <Input
                      id="status-message"
                      placeholder="Set a custom status message..."
                      value={customStatusMessage}
                      onChange={(e) => {
                        setCustomStatusMessage(e.target.value);
                        handleStatusMessageChange(e.target.value);
                      }}
                      className="h-8 text-sm"
                      maxLength={100}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {customStatusMessage.length}/100
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator />

                {canManageWorkspace && (
                  <>
                    <DropdownMenuSeparator className="lg:hidden" />
                    <DropdownMenuItem
                      onClick={() => setShowWorkspaceSettings(true)}
                      className="lg:hidden"
                      data-testid="menu-workspace-settings"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {t('sidebar.settings')}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <WorkspaceSettingsDialog
        open={showWorkspaceSettings}
        onOpenChange={setShowWorkspaceSettings}
      />

      <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <SheetContent side="top" className="w-full sm:mx-auto sm:max-w-lg border-border/50 bg-background/95 backdrop-blur-xl">
          <SheetHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <SheetTitle className="text-lg font-semibold">{t('search.placeholder')}</SheetTitle>
            </div>
            <SheetDescription className="text-sm text-muted-foreground">
              {t('search.mobileDescription', {
                defaultValue: 'Find tasks across all lists and assignees.',
              })}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <SearchBar onResultSelect={() => setMobileSearchOpen(false)} autoFocus />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileWorkspaceOpen} onOpenChange={setMobileWorkspaceOpen}>
        <SheetContent side="bottom" className="w-full sm:mx-auto sm:max-w-lg border-border/50 bg-background/95 backdrop-blur-xl">
          <SheetHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-blue-600" />
              </div>
              <SheetTitle className="text-lg font-semibold">
                {t('workspace.switchWorkspace', { defaultValue: 'Switch workspace' })}
              </SheetTitle>
            </div>
            <SheetDescription className="text-sm text-muted-foreground">
              {t('workspace.switchWorkspaceDescription', {
                defaultValue: 'Select a workspace to continue.',
              })}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <WorkspaceSwitcher />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
