import { Switch, Route, Redirect } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { queryClient } from './lib/queryClient';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ListPage from '@/pages/ListPage';
import TodayPage from '@/pages/TodayPage';
import UpcomingPage from '@/pages/UpcomingPage';
import AssignedPage from '@/pages/AssignedPage';
import { AppSidebar } from '@/components/AppSidebar';
import { Navbar } from '@/components/Navbar';
import NotFound from '@/pages/not-found';
import '@/i18n/i18n';

function PrivateRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function AppContent() {
  const { user, isLoading } = useAuth();

  const sidebarStyle = {
    '--sidebar-width': '16rem',
    '--sidebar-width-icon': '3rem',
  } as React.CSSProperties;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        <PublicRoute component={LoginPage} />
      </Route>
      <Route path="/register">
        <PublicRoute component={RegisterPage} />
      </Route>
      
      {user ? (
        <WorkspaceProvider>
          <WebSocketProvider>
            <SidebarProvider style={sidebarStyle}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1">
                  <Navbar />
                  <main className="flex-1 overflow-auto">
                    <Switch>
                      <Route path="/">
                        <PrivateRoute component={DashboardPage} />
                      </Route>
                      <Route path="/list/:id">
                        <PrivateRoute component={ListPage} />
                      </Route>
                      <Route path="/today">
                        <PrivateRoute component={TodayPage} />
                      </Route>
                      <Route path="/upcoming">
                        <PrivateRoute component={UpcomingPage} />
                      </Route>
                      <Route path="/assigned">
                        <PrivateRoute component={AssignedPage} />
                      </Route>
                      <Route component={NotFound} />
                    </Switch>
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </WebSocketProvider>
        </WorkspaceProvider>
      ) : (
        <Route path="/">
          <Redirect to="/login" />
        </Route>
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
