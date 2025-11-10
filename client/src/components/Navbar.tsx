import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Settings, Search, Briefcase } from 'lucide-react';
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { hasPermission } = useWorkspace();
  const [, setLocation] = useLocation();
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const isMobile = useIsMobile();

  const canManageWorkspace = hasPermission('MANAGE_WORKSPACE');

  const handleLogout = () => {
    logout();
    setLocation('/login');
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
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="h-9 w-9" />
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{t('appName')}</h1>
          </div>
          <div className="hidden md:flex">
            <WorkspaceSwitcher />
          </div>
          <div className="hidden lg:flex flex-1 px-4">
            <SearchBar />
          </div>
          <div className="ml-auto flex items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSearchOpen(true)}
              className="inline-flex h-9 w-9 md:hidden"
              data-testid="button-mobile-search"
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">{t('search.placeholder')}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileWorkspaceOpen(true)}
              className="inline-flex h-9 w-9 md:hidden"
              data-testid="button-mobile-workspaces"
            >
              <Briefcase className="h-5 w-5" />
              <span className="sr-only">
                {t('workspace.switchWorkspace', { defaultValue: 'Switch workspace' })}
              </span>
            </Button>
            {canManageWorkspace && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowWorkspaceSettings(true)}
                className="hidden lg:inline-flex h-9 w-9"
                data-testid="button-workspace-settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
            <NotificationBell />
            <div className="hidden sm:inline-flex items-center">
              <ThemeToggle />
            </div>
            <div className="hidden md:inline-flex items-center">
              <LanguageSwitcher />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 rounded-full p-0"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
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
      </header>

      <WorkspaceSettingsDialog
        open={showWorkspaceSettings}
        onOpenChange={setShowWorkspaceSettings}
      />

      <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <SheetContent side="top" className="w-full sm:mx-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t('search.placeholder')}</SheetTitle>
            <SheetDescription>
              {t('search.mobileDescription', {
                defaultValue: 'Find tasks across all lists and assignees.',
              })}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <SearchBar onResultSelect={() => setMobileSearchOpen(false)} autoFocus />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileWorkspaceOpen} onOpenChange={setMobileWorkspaceOpen}>
        <SheetContent side="bottom" className="w-full sm:mx-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {t('workspace.switchWorkspace', { defaultValue: 'Switch workspace' })}
            </SheetTitle>
            <SheetDescription>
              {t('workspace.switchWorkspaceDescription', {
                defaultValue: 'Select a workspace to continue.',
              })}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <WorkspaceSwitcher />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
