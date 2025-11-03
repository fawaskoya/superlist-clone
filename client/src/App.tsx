import { Switch, Route, Redirect, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { queryClient } from './lib/queryClient';
import Landing from '@/pages/Landing';
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

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

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

  // Check if current path is a private route
  // NOTE: When adding new private routes, make sure to add them to this list
  const privatePaths = ['/dashboard', '/today', '/upcoming', '/assigned', '/list'];
  const isPrivateRoute = privatePaths.some(path => location.startsWith(path));

  // If user is authenticated, show the app with persistent layout
  if (user) {
    return (
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
                      <Redirect to="/dashboard" />
                    </Route>
                    <Route path="/login">
                      <Redirect to="/dashboard" />
                    </Route>
                    <Route path="/register">
                      <Redirect to="/dashboard" />
                    </Route>
                    <Route path="/dashboard" component={DashboardPage} />
                    <Route path="/list/:id" component={ListPage} />
                    <Route path="/today" component={TodayPage} />
                    <Route path="/upcoming" component={UpcomingPage} />
                    <Route path="/assigned" component={AssignedPage} />
                    <Route component={NotFound} />
                  </Switch>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </WebSocketProvider>
      </WorkspaceProvider>
    );
  }

  // User is not authenticated
  // If trying to access a private route, redirect to landing page
  if (isPrivateRoute) {
    return <Redirect to="/" />;
  }

  // Show public pages
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <AppContent />
            </TooltipProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
