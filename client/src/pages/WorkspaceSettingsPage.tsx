import { useState } from 'react';
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
import { Loader2, UserPlus, Trash2, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-workspace-settings">
          {t('workspace.settings')}
        </h1>
        <p className="text-muted-foreground mt-1">{currentWorkspace.name}</p>
      </div>

      {/* Members Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle data-testid="heading-members">{t('workspace.members')}</CardTitle>
              <CardDescription>{t('workspace.membersDescription')}</CardDescription>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-invite-member">
                  <UserPlus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t('workspace.inviteMember')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('workspace.inviteMember')}</DialogTitle>
                  <DialogDescription>{t('workspace.inviteMemberDescription')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('common.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      data-testid="input-invite-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">{t('workspace.role')}</Label>
                    <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                      <SelectTrigger data-testid="select-invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">{t('workspace.roles.admin')}</SelectItem>
                        <SelectItem value="MEMBER">{t('workspace.roles.member')}</SelectItem>
                        <SelectItem value="VIEWER">{t('workspace.roles.viewer')}</SelectItem>
                      </SelectContent>
                    </Select>
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
        <CardContent>
          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('workspace.role')}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                        </Avatar>
                        <span data-testid={`text-member-name-${member.id}`}>{member.user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-member-email-${member.id}`}>
                      {member.user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)} data-testid={`badge-role-${member.id}`}>
                        {t(`workspace.roles.${member.role.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.role !== 'OWNER' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMemberMutation.mutate(member.user.id)}
                          disabled={removeMemberMutation.isPending}
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Section */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="heading-pending-invitations">
            {t('workspace.pendingInvitations')}
          </CardTitle>
          <CardDescription>{t('workspace.pendingInvitationsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-invitations">
              {t('workspace.noPendingInvitations')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('workspace.role')}</TableHead>
                  <TableHead>{t('common.expiresAt')}</TableHead>
                  <TableHead className="w-[150px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id} data-testid={`row-invitation-${invitation.id}`}>
                    <TableCell data-testid={`text-invitation-email-${invitation.id}`}>
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-invitation-role-${invitation.id}`}>
                        {t(`workspace.roles.${invitation.role.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-invitation-expires-${invitation.id}`}>
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyLink(invitation.token)}
                          data-testid={`button-copy-link-${invitation.id}`}
                        >
                          {copiedToken === invitation.token ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                          disabled={deleteInvitationMutation.isPending}
                          data-testid={`button-delete-invitation-${invitation.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
