import { Switch, Route, Redirect, useLocation } from 'wouter';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { CallNotificationManager } from '@/components/CallNotificationManager';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from './lib/queryClient';
import Landing from '@/pages/Landing';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import TasksPage from '@/pages/TasksPage';
import ListPage from '@/pages/ListPage';
import TodayPage from '@/pages/TodayPage';
import UpcomingPage from '@/pages/UpcomingPage';
import AssignedPage from '@/pages/AssignedPage';
import { MyDayPage } from '@/pages/MyDayPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ChatPage } from '@/pages/ChatPage';
import { AdminPage } from '@/pages/AdminPage';
import { CalendarPage } from '@/pages/CalendarPage';
import AcceptInvitation from '@/pages/AcceptInvitation';
import WorkspaceSettingsPage from '@/pages/WorkspaceSettingsPage';
import { AppSidebar } from '@/components/AppSidebar';
import { Navbar } from '@/components/Navbar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import NotFound from '@/pages/not-found';
import '@/i18n/i18n';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // Scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const sidebarStyle = {
    '--sidebar-width': '16rem',
    '--sidebar-width-mobile': '18rem',
    '--sidebar-width-icon': '3rem',
  } as React.CSSProperties;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Check if current path is an invitation - always show without app layout
  const isInvitationPage = location.startsWith('/invite/');

  // Check if current path is a private route
  // NOTE: When adding new private routes, make sure to add them to this list
    const privatePaths = ['/dashboard', '/tasks', '/today', '/upcoming', '/assigned', '/list', '/settings', '/my-day', '/analytics', '/chat', '/admin', '/calendar'];
  const isPrivateRoute = privatePaths.some(path => location.startsWith(path));

  // Show invitation page without app layout (cleaner UX)
  if (isInvitationPage) {
    return (
      <Switch>
        <Route path="/invite/:token" component={AcceptInvitation} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // If user is authenticated, show the app with persistent layout
  if (user) {
    // Admin users get redirected to admin dashboard
    const isAdmin = user.isAdmin;
    const defaultRoute = isAdmin ? "/admin" : "/dashboard";

    return (
        <WorkspaceProvider>
              <WebSocketProvider>
                <SidebarProvider style={sidebarStyle}>
                  <AnimatedBackground />
                  <div className="flex h-screen w-full relative z-10">
                    <AppSidebar />
                    <div className="flex flex-col flex-1 min-w-0">
                      <Navbar />
                      <CallNotificationManager />
                      <main className="flex-1 overflow-auto scrollbar-thin px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                        <Switch>
                          <Route path="/">
                            <Redirect to={defaultRoute} />
                          </Route>
                          <Route path="/login">
                            <Redirect to={defaultRoute} />
                          </Route>
                          <Route path="/register">
                            <Redirect to={defaultRoute} />
                          </Route>
                          <Route path="/dashboard" component={DashboardPage} />
                          <Route path="/tasks" component={TasksPage} />
                          <Route path="/list/:id" component={ListPage} />
                          <Route path="/today" component={TodayPage} />
                          <Route path="/upcoming" component={UpcomingPage} />
                          <Route path="/assigned" component={AssignedPage} />
                          <Route path="/my-day" component={MyDayPage} />
                          <Route path="/analytics" component={AnalyticsPage} />
                          <Route path="/chat" component={ChatPage} />
                          <Route path="/calendar" component={CalendarPage} />
                          <Route path="/admin" component={AdminPage} />
                          <Route path="/settings" component={WorkspaceSettingsPage} />
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
      <ErrorBoundary>
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
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
