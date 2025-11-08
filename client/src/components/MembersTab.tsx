import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, MoreVertical, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InviteMemberDialog } from './InviteMemberDialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@shared/schema';

interface Member {
  userId: string;
  workspaceId: string;
  role: Role;
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  effectivePermissions: string[];
  defaultPermissions: string[];
}

interface MembersTabProps {
  workspaceId: string;
}

export function MembersTab({ workspaceId }: MembersTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['/api/workspaces', workspaceId, 'members'],
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      apiRequest('PATCH', `/api/workspaces/${workspaceId}/members/${userId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspaceId, 'members'] });
      toast({
        title: t('common.success'),
        description: t('workspace.roleUpdated'),
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

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest('DELETE', `/api/workspaces/${workspaceId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspaceId, 'members'] });
      toast({
        title: t('common.success'),
        description: t('workspace.memberRemoved'),
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

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case 'OWNER':
        return 'default';
      case 'ADMIN':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const currentUserMember = members?.find((m) => m.userId === currentUser?.id);
  const canManageMembers = currentUserMember?.effectivePermissions.includes('MANAGE_MEMBERS');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('workspace.membersCount', { count: members?.length || 0 })}
        </p>
        {canManageMembers && (
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="gap-2"
            data-testid="button-invite-member"
          >
            <UserPlus className="h-4 w-4" />
            {t('workspace.inviteMember')}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {members?.map((member) => {
          const isCurrentUser = member.userId === currentUser?.id;
          const isOwner = member.role === 'OWNER';
          const canModify = canManageMembers && !isOwner && !isCurrentUser;

          return (
            <div
              key={member.userId}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
              data-testid={`member-${member.userId}`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {member.user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {member.user.name}
                      {isCurrentUser && (
                        <span className="text-muted-foreground text-sm ml-2">
                          ({t('workspace.you')})
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">{member.user.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canModify ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      updateRoleMutation.mutate({ userId: member.userId, role: value as Role })
                    }
                  >
                    <SelectTrigger className="w-32" data-testid={`select-role-${member.userId}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">{t('workspace.roles.admin')}</SelectItem>
                      <SelectItem value="MEMBER">{t('workspace.roles.member')}</SelectItem>
                      <SelectItem value="VIEWER">{t('workspace.roles.viewer')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={getRoleBadgeVariant(member.role)} data-testid={`badge-role-${member.userId}`}>
                    {t(`workspace.roles.${member.role.toLowerCase()}`)}
                  </Badge>
                )}

                {canModify && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-member-menu-${member.userId}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('workspace.memberActions')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => removeMemberMutation.mutate(member.userId)}
                        className="text-destructive focus:text-destructive"
                        data-testid={`button-remove-member-${member.userId}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('workspace.removeMember')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <InviteMemberDialog
        workspaceId={workspaceId}
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
    </div>
  );
}
