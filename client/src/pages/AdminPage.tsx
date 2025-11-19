import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  Users,
  Building,
  BarChart3,
  Search,
  Edit,
  Trash2,
  Plus,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Clock,
  Calendar,
  Target,
  TrendingUp,
  Activity,
  Settings,
  MessageCircle,
  Sun,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { TaskList } from '@/components/TaskList';
import type { List as ListType, Task } from '@shared/schema';

interface AdminStats {
  totalUsers: number;
  totalOrganizations: number;
  totalWorkspaces: number;
  totalTasks: number;
  adminUsers: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    domain: string;
  };
  createdAt: string;
  updatedAt: string;
  _count: {
    ownedWorkspaces: number;
    workspaceMemberships: number;
    createdTasks: number;
  };
}

interface AdminOrganization {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    workspaces: number;
  };
}

export function AdminPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [userSearch, setUserSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [orgPage, setOrgPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganization | null>(null);

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Admin Stats
  const { data: adminStats } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: () => apiRequest('GET', '/api/admin/stats') as Promise<AdminStats>,
  });

  // Regular Dashboard Data
  const { data: lists = [] } = useQuery<ListType[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'lists'],
    enabled: !!currentWorkspace?.id,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'inbox'],
    enabled: !!currentWorkspace?.id,
  });

  const { data: todayTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'today'],
    enabled: !!currentWorkspace?.id,
  });

  const { data: upcomingTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'upcoming'],
    enabled: !!currentWorkspace?.id,
  });

  // Users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users', userPage, userSearch],
    queryFn: () => apiRequest('GET', `/api/admin/users?page=${userPage}&limit=10&search=${encodeURIComponent(userSearch)}`) as Promise<{
      users: AdminUser[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>,
  });

  // Organizations
  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['/api/admin/organizations', orgPage, orgSearch],
    queryFn: () => apiRequest('GET', `/api/admin/organizations?page=${orgPage}&limit=10&search=${encodeURIComponent(orgSearch)}`) as Promise<{
      organizations: AdminOrganization[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>,
  });

  // Mutations
  const toggleAdminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      apiRequest('PUT', `/api/admin/users/${userId}/admin`, { isAdmin }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      await refreshUser(); // Refresh current user data in case it was changed
      toast({
        title: 'Success',
        description: 'User admin status updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user admin status',
        variant: 'destructive',
      });
    },
  });

  const moveUserMutation = useMutation({
    mutationFn: ({ userId, organizationId }: { userId: string; organizationId?: string }) =>
      apiRequest('PUT', `/api/admin/users/${userId}/organization`, { organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      setSelectedUser(null);
      toast({
        title: 'Success',
        description: 'User moved to organization successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to move user',
        variant: 'destructive',
      });
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: ({ domain, name }: { domain: string; name: string }) =>
      apiRequest('POST', '/api/admin/organizations', { domain, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSelectedOrg(null);
      toast({
        title: 'Success',
        description: 'Organization created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive',
      });
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, domain, name }: { id: string; domain: string; name: string }) =>
      apiRequest('PUT', `/api/admin/organizations/${id}`, { domain, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      setSelectedOrg(null);
      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update organization',
        variant: 'destructive',
      });
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/organizations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: 'Success',
        description: 'Organization deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete organization',
        variant: 'destructive',
      });
    },
  });

  const handleToggleAdmin = (user: AdminUser) => {
    toggleAdminMutation.mutate({ userId: user.id, isAdmin: !user.isAdmin });
  };

  const handleMoveUser = (organizationId?: string) => {
    if (!selectedUser) return;
    moveUserMutation.mutate({ userId: selectedUser.id, organizationId });
  };

  const handleCreateOrg = (data: { domain: string; name: string }) => {
    createOrgMutation.mutate(data);
  };

  const handleUpdateOrg = (data: { domain: string; name: string }) => {
    if (!selectedOrg) return;
    updateOrgMutation.mutate({ id: selectedOrg.id, ...data });
  };

  const handleDeleteOrg = (org: AdminOrganization) => {
    deleteOrgMutation.mutate(org.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Complete task management with administrative controls</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <Shield className="h-3 w-3 mr-1" />
          Administrator
        </Badge>
      </div>

      {/* Admin Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.totalOrganizations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.totalWorkspaces || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.totalTasks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.adminUsers || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab - Regular App Features */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today
                </CardTitle>
                <CardDescription>Your tasks for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todayTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted">
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{task.title}</span>
                    </div>
                  ))}
                  {todayTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tasks for today</p>
                  )}
                  {todayTasks.length > 5 && (
                    <p className="text-xs text-muted-foreground">+{todayTasks.length - 5} more tasks</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming
                </CardTitle>
                <CardDescription>Tasks due soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{task.title}</span>
                    </div>
                  ))}
                  {upcomingTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No upcoming tasks</p>
                  )}
                  {upcomingTasks.length > 5 && (
                    <p className="text-xs text-muted-foreground">+{upcomingTasks.length - 5} more tasks</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Admin shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('users')}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('organizations')}>
                  <Building className="h-4 w-4 mr-2" />
                  Manage Organizations
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('analytics')}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Inbox Tasks</CardTitle>
              <CardDescription>Recent tasks from your inbox</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks.slice(0, 10).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                      )}
                    </div>
                    <Badge variant={task.status === 'DONE' ? 'secondary' : 'default'}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No tasks in inbox</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab - Full Task Management */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Lists Sidebar */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Lists
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lists.map((list) => (
                  <Button
                    key={list.id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {/* TODO: Navigate to list */}}
                  >
                    <List className="h-4 w-4 mr-2" />
                    {list.name}
                  </Button>
                ))}
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  New List
                </Button>
              </CardContent>
            </Card>

            {/* Tasks View */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>All Tasks</CardTitle>
                  <CardDescription>Manage all tasks across your workspace</CardDescription>
                </CardHeader>
                <CardContent>
                  <TaskList />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>

          <div className="space-y-4">
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              usersData?.users.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            <Users className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {user.isAdmin && <Badge variant="secondary">Admin</Badge>}
                            {user.organization && (
                              <Badge variant="outline">
                                <Building className="h-3 w-3 mr-1" />
                                {user.organization.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAdmin(user)}
                          disabled={toggleAdminMutation.isPending}
                        >
                          {user.isAdmin ? (
                            <>
                              <ShieldOff className="h-3 w-3 mr-1" />
                              Remove Admin
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Make Admin
                            </>
                          )}
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Move Org
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Move User to Organization</DialogTitle>
                              <DialogDescription>
                                Move {user.name} to a different organization or remove from organization.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Organization</Label>
                                <Select onValueChange={(value) => handleMoveUser(value === 'none' ? undefined : value)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select organization" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No Organization</SelectItem>
                                    {orgsData?.organizations.map((org) => (
                                      <SelectItem key={org.id} value={org.id}>
                                        {org.name} ({org.domain})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {usersData?.pagination && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((userPage - 1) * 10) + 1} to {Math.min(userPage * 10, usersData.pagination.total)} of {usersData.pagination.total} users
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserPage(Math.max(1, userPage - 1))}
                  disabled={userPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserPage(Math.min(usersData.pagination.pages, userPage + 1))}
                  disabled={userPage === usersData.pagination.pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Organization</DialogTitle>
                  <DialogDescription>
                    Create a new organization for grouping users by domain.
                  </DialogDescription>
                </DialogHeader>
                <OrganizationForm onSubmit={handleCreateOrg} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {orgsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              orgsData?.organizations.map((org) => (
                <Card key={org.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            <Building className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">{org.domain}</p>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                            <span>{org._count.users} users</span>
                            <span>{org._count.workspaces} workspaces</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedOrg(org)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Organization</DialogTitle>
                              <DialogDescription>
                                Update organization details.
                              </DialogDescription>
                            </DialogHeader>
                            <OrganizationForm
                              initialData={org}
                              onSubmit={handleUpdateOrg}
                            />
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={org._count.users > 0}>
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this organization? This action cannot be undone.
                                {org._count.users > 0 && (
                                  <span className="block mt-2 text-destructive">
                                    Cannot delete organization with active users. Move users to another organization first.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteOrg(org)}
                                disabled={org._count.users > 0}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {orgsData?.pagination && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((orgPage - 1) * 10) + 1} to {Math.min(orgPage * 10, orgsData.pagination.total)} of {orgsData.pagination.total} organizations
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrgPage(Math.max(1, orgPage - 1))}
                  disabled={orgPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrgPage(Math.min(orgsData.pagination.pages, orgPage + 1))}
                  disabled={orgPage === orgsData.pagination.pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Task Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">85%</div>
                <p className="text-sm text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{adminStats?.totalUsers || 0}</div>
                <p className="text-sm text-muted-foreground">Total registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Messages Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">1,234</div>
                <p className="text-sm text-muted-foreground">Across all channels</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Overall system performance and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">99.9%</div>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">2.3s</div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{adminStats?.totalWorkspaces || 0}</div>
                  <p className="text-sm text-muted-foreground">Active Workspaces</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{adminStats?.totalTasks || 0}</div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface OrganizationFormProps {
  initialData?: AdminOrganization;
  onSubmit: (data: { domain: string; name: string }) => void;
}

function OrganizationForm({ initialData, onSubmit }: OrganizationFormProps) {
  const [domain, setDomain] = useState(initialData?.domain || '');
  const [name, setName] = useState(initialData?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ domain, name });
    if (!initialData) {
      setDomain('');
      setName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="domain">Domain</Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="company.com"
          required
        />
      </div>
      <div>
        <Label htmlFor="name">Organization Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Company Inc."
          required
        />
      </div>
      <DialogFooter>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}

