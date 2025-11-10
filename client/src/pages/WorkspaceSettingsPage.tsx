import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, UserPlus, Trash2, Copy, Check, Settings, Users, Clock, Shield, Crown, UserCheck, Mail, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import type { Task } from '@shared/schema';

interface WorkspaceMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
}

export default function WorkspaceSettingsPage() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('members');

  // Fetch workspace members
  const { data: members = [], isLoading: membersLoading } = useQuery<WorkspaceMember[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'members'],
    enabled: !!currentWorkspace?.id,
  });

  // Fetch pending invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery<PendingInvitation[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'invitations'],
    enabled: !!currentWorkspace?.id,
  });

  // Fetch all tasks to calculate active projects
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks', 'all'],
    enabled: !!currentWorkspace?.id,
  });

  // Calculate active projects (lists with at least one non-completed task)
  const activeProjectsCount = useMemo(() => {
    const activeTaskLists = new Set(
      allTasks
        .filter((task: any) => task.status !== 'DONE' && task.listId)
        .map((task: any) => task.listId)
    );
    return activeTaskLists.size;
  }, [allTasks]);

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      apiRequest('POST', `/api/workspaces/${currentWorkspace?.id}/invitations`, data),
    onSuccess: () => {
      toast({
        title: t('workspace.invitationSent'),
        description: t('workspace.invitationSentDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', currentWorkspace?.id, 'invitations'] });
      setInviteEmail('');
      setInviteRole('MEMBER');
      setInviteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t('workspace.invitationFailed'),
        description: error.message || t('common.error'),
        variant: 'destructive',
      });
    },
  });

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      apiRequest('DELETE', `/api/workspaces/${currentWorkspace?.id}/invitations/${invitationId}`, {}),
    onSuccess: () => {
      toast({
        title: t('workspace.invitationDeleted'),
        description: t('workspace.invitationDeletedDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', currentWorkspace?.id, 'invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
        variant: 'destructive',
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest('DELETE', `/api/workspaces/${currentWorkspace?.id}/members/${userId}`, {}),
    onSuccess: () => {
      toast({
        title: t('workspace.memberRemoved'),
        description: t('workspace.memberRemovedDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', currentWorkspace?.id, 'members'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('common.error'),
        variant: 'destructive',
      });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail || !inviteRole) {
      return;
    }
    createInvitationMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleCopyLink = (token: string) => {
    const inviteLink = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(token);
    toast({
      title: t('common.copied'),
      description: t('workspace.invitationLinkCopied'),
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default';
      case 'ADMIN':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>{t('workspace.selectWorkspace')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 page-enter">
      {/* Creative Settings Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/10 border border-purple-200/50 dark:border-purple-800/30 flex items-center justify-center shadow-sm">
              <Settings className="w-5 h-5 sm:w-7 sm:h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {t('workspace.settings')}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your workspace and team
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-purple/10 border border-purple-200/30 dark:border-purple-800/20">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-blue/10 border border-blue-200/30 dark:border-blue-800/20">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              {invitations.length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Workspace Info Card */}
      <Card className="card-creative mb-4 sm:mb-6">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{currentWorkspace.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Workspace • Created recently</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge variant="secondary" className="rounded-full px-2.5 sm:px-3 py-1 text-xs">
                <Crown className="w-3 h-3 mr-1" />
                Owner
              </Badge>
            </div>
          </div>

          {/* Progress/Stats */}
          <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 rounded-lg bg-gradient-secondary/50">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{members.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Team Members</div>
              <Progress value={(members.length / 10) * 100} className="mt-2 h-1.5 sm:h-2" />
            </div>
            <div className="text-center p-3 sm:p-4 rounded-lg bg-gradient-accent/50">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{activeProjectsCount}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Active Projects</div>
              <Progress value={Math.min((activeProjectsCount / 10) * 100, 100)} className="mt-2 h-1.5 sm:h-2" />
            </div>
            <div className="text-center p-3 sm:p-4 rounded-lg bg-gradient-primary/10">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{invitations.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Pending Invites</div>
              <Progress value={(invitations.length / 5) * 100} className="mt-2 h-1.5 sm:h-2" />
            </div>
          </div>
        </div>
      </Card>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-auto p-1">
          <TabsTrigger value="members" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2.5 sm:py-3">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Team Members</span>
            <span className="xs:hidden">Members</span>
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2.5 sm:py-3">
            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Invitations</span>
            <span className="xs:hidden">Invites</span>
            {invitations.length > 0 && (
              <Badge variant="secondary" className="ml-1 sm:ml-2 rounded-full px-1.5 sm:px-2 py-0 text-xs">
                {invitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          {/* Members Section */}
          <Card className="card-creative">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/10 border border-green-200/50 dark:border-green-800/30 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle data-testid="heading-members" className="text-lg">{t('workspace.members')}</CardTitle>
                    <CardDescription className="text-sm">{t('workspace.membersDescription')}</CardDescription>
                  </div>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="btn-creative scale-hover" data-testid="button-invite-member">
                      <UserPlus className="h-4 w-4 icon-interactive" />
                      {t('workspace.inviteMember')}
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <DialogTitle className="text-lg">{t('workspace.inviteMember')}</DialogTitle>
                        <DialogDescription className="text-sm">
                          {t('workspace.inviteMemberDescription')}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="space-y-5 py-2">
                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-sm font-medium">{t('common.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="input-enhanced h-11"
                        data-testid="input-invite-email"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="role" className="text-sm font-medium">{t('workspace.role')}</Label>
                      <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                        <SelectTrigger className="h-11 focus-ring-enhanced" data-testid="select-invite-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER" className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            {t('workspace.roles.member')} - Can create and edit tasks
                          </SelectItem>
                          <SelectItem value="ADMIN" className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            {t('workspace.roles.admin')} - Full workspace access
                          </SelectItem>
                          <SelectItem value="VIEWER" className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                            {t('workspace.roles.viewer')} - Read-only access
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {inviteRole === 'MEMBER' && 'Can create tasks, edit their own, and comment'}
                        {inviteRole === 'ADMIN' && 'Can manage members, settings, and all workspace content'}
                        {inviteRole === 'VIEWER' && 'Can view all content but cannot make changes'}
                      </p>
                    </div>
                  </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                    data-testid="button-cancel-invite"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={createInvitationMutation.isPending || !inviteEmail}
                    data-testid="button-send-invitation"
                  >
                    {createInvitationMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
                    )}
                    {t('workspace.sendInvitation')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
            <CardContent className="pt-0">
              {membersLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center mb-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Loading team members...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No team members yet</h3>
                  <p className="text-sm text-muted-foreground/70 max-w-xs">
                    Invite your first team member to get started collaborating!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member, index) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/50 transition-all duration-200 animate-in slide-in-from-left-4"
                      style={{ animationDelay: `${index * 100}ms` }}
                      data-testid={`row-member-${member.id}`}
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                            {getInitials(member.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground" data-testid={`text-member-name-${member.id}`}>
                            {member.user.name}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-member-email-${member.id}`}>
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <Badge
                          variant={getRoleBadgeVariant(member.role)}
                          className="rounded-full px-3 py-1 font-medium"
                          data-testid={`badge-role-${member.id}`}
                        >
                          {member.role === 'OWNER' && <Crown className="w-3 h-3 mr-1" />}
                          {member.role === 'ADMIN' && <Shield className="w-3 h-3 mr-1" />}
                          {t(`workspace.roles.${member.role.toLowerCase()}`)}
                        </Badge>
                        {member.role !== 'OWNER' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMemberMutation.mutate(member.user.id)}
                            disabled={removeMemberMutation.isPending}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 scale-hover"
                            data-testid={`button-remove-member-${member.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          {/* Pending Invitations Section */}
          <Card className="card-creative">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200/50 dark:border-blue-800/30 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle data-testid="heading-pending-invitations" className="text-lg">
                    {t('workspace.pendingInvitations')}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t('workspace.pendingInvitationsDescription')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {invitationsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center mb-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Loading invitations...</p>
                </div>
              ) : invitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center mb-4">
                    <Mail className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No pending invitations</h3>
                  <p className="text-sm text-muted-foreground/70 max-w-xs">
                    All invitations have been accepted or expired. Send new invites to grow your team!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invitation, index) => (
                    <div
                      key={invitation.id}
                      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/50 transition-all duration-200 animate-in slide-in-from-left-4"
                      style={{ animationDelay: `${index * 100}ms` }}
                      data-testid={`row-invitation-${invitation.id}`}
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/20 dark:to-blue-950/10 border border-blue-200/50 dark:border-blue-800/30 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground" data-testid={`text-invitation-email-${invitation.id}`}>
                            {invitation.email}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <Badge variant="outline" className="rounded-full px-3 py-1" data-testid={`badge-invitation-role-${invitation.id}`}>
                          {t(`workspace.roles.${invitation.role.toLowerCase()}`)}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyLink(invitation.token)}
                            className="h-8 w-8 scale-hover focus-ring-enhanced"
                            data-testid={`button-copy-link-${invitation.id}`}
                          >
                            {copiedToken === invitation.token ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                            disabled={deleteInvitationMutation.isPending}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 scale-hover"
                            data-testid={`button-delete-invitation-${invitation.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
