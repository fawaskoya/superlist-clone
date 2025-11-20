import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Search, Users, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';

interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  presence?: {
    status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
    lastSeen: string;
  };
}

interface WorkspaceMember {
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface OrganizationAssigneeSelectorProps {
  currentAssigneeId: string | null;
  workspaceMembers: WorkspaceMember[];
  onAssigneeChange: (userId: string) => void;
}

export function OrganizationAssigneeSelector({
  currentAssigneeId,
  workspaceMembers,
  onAssigneeChange,
}: OrganizationAssigneeSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch organization users
  const { data: orgUsers = [], isLoading: isLoadingOrg } = useQuery({
    queryKey: ['/api/organization/users'],
    queryFn: async () => {
      const response = await fetch('/api/organization/users');
      if (!response.ok) {
        throw new Error('Failed to fetch organization users');
      }
      return response.json() as Promise<OrganizationUser[]>;
    },
  });

  // Get current assignee
  const currentAssignee = useMemo(() => {
    if (!currentAssigneeId) return null;

    // Check workspace members first
    const workspaceMember = workspaceMembers.find(m => m.user.id === currentAssigneeId);
    if (workspaceMember) {
      return {
        id: workspaceMember.user.id,
        name: workspaceMember.user.name,
        email: workspaceMember.user.email,
        type: 'workspace' as const,
      };
    }

    // Check organization users
    const orgUser = orgUsers.find(u => u.id === currentAssigneeId);
    if (orgUser) {
      return {
        id: orgUser.id,
        name: orgUser.name,
        email: orgUser.email,
        type: 'organization' as const,
        presence: orgUser.presence,
      };
    }

    return null;
  }, [currentAssigneeId, workspaceMembers, orgUsers]);

  // Filter and organize users
  const { organizationUsers, otherWorkspaceMembers } = useMemo(() => {
    const orgUserIds = new Set(orgUsers.map(u => u.id));

    // Organization users in workspace (prioritized)
    const orgUsersInWorkspace = workspaceMembers
      .filter(member => orgUserIds.has(member.user.id))
      .map(member => ({
        ...member.user,
        type: 'organization' as const,
        presence: orgUsers.find(u => u.id === member.user.id)?.presence,
      }));

    // Other organization users (not in this workspace)
    const otherOrgUsers = orgUsers
      .filter(user => !workspaceMembers.some(member => member.user.id === user.id))
      .map(user => ({
        ...user,
        type: 'organization' as const,
      }));

    // Workspace members not in organization
    const nonOrgWorkspaceMembers = workspaceMembers
      .filter(member => !orgUserIds.has(member.user.id))
      .map(member => ({
        ...member.user,
        type: 'workspace' as const,
      }));

    // Combine organization users
    const allOrgUsers = [...orgUsersInWorkspace, ...otherOrgUsers];

    // Filter by search query
    const filteredOrgUsers = searchQuery
      ? allOrgUsers.filter(user =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allOrgUsers;

    const filteredWorkspaceMembers = searchQuery
      ? nonOrgWorkspaceMembers.filter(user =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : nonOrgWorkspaceMembers;

    return {
      organizationUsers: filteredOrgUsers,
      otherWorkspaceMembers: filteredWorkspaceMembers,
    };
  }, [orgUsers, workspaceMembers, searchQuery]);

  const getPresenceColor = (status?: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-500';
      case 'AWAY': return 'bg-yellow-500';
      case 'BUSY': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPresenceText = (status?: string) => {
    switch (status) {
      case 'ONLINE': return 'Online';
      case 'AWAY': return 'Away';
      case 'BUSY': return 'Busy';
      default: return 'Offline';
    }
  };

  const handleUserSelect = (userId: string) => {
    onAssigneeChange(userId);
    setOpen(false);
    setSearchQuery('');
  };

  const handleUnassign = () => {
    onAssigneeChange('unassigned');
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start h-auto p-3 font-normal"
          data-testid="select-assignee"
        >
          {currentAssignee ? (
            <div className="flex items-center space-x-3 w-full">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                {currentAssignee.type === 'organization' && currentAssignee.presence && (
                  <div
                    className={`absolute -bottom-1 -right-1 h-2 w-2 rounded-full border border-background ${getPresenceColor(currentAssignee.presence.status)}`}
                  />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{currentAssignee.name}</p>
                <p className="text-xs text-muted-foreground truncate">{currentAssignee.email}</p>
              </div>
              {currentAssignee.type === 'organization' && (
                <Badge variant="secondary" className="text-xs">
                  <Building className="h-3 w-3 mr-1" />
                  Org
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{t('task.assigneePlaceholder')}</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {/* Unassigned option */}
          <Button
            variant="ghost"
            className="w-full justify-start h-auto p-3 rounded-none border-b"
            onClick={handleUnassign}
            data-testid="select-item-assignee-unassigned"
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium">{t('task.unassigned')}</p>
                <p className="text-xs text-muted-foreground">No assignee</p>
              </div>
            </div>
          </Button>

          {/* Organization users section */}
          {organizationUsers.length > 0 && (
            <>
              <div className="px-3 py-2 bg-muted/50">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Building className="h-4 w-4" />
                  <span>Organization Members</span>
                  <Badge variant="secondary" className="text-xs">
                    {organizationUsers.length}
                  </Badge>
                </div>
              </div>
              {organizationUsers.map((user) => (
                <Button
                  key={user.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 rounded-none"
                  onClick={() => handleUserSelect(user.id)}
                  data-testid={`select-item-assignee-${user.id}`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      {user.presence && (
                        <div
                          className={`absolute -bottom-1 -right-1 h-2 w-2 rounded-full border border-background ${getPresenceColor(user.presence.status)}`}
                        />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {user.presence && (
                      <Badge variant="outline" className="text-xs">
                        {getPresenceText(user.presence.status)}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </>
          )}

          {/* Other workspace members section */}
          {otherWorkspaceMembers.length > 0 && (
            <>
              {organizationUsers.length > 0 && <Separator />}
              <div className="px-3 py-2 bg-muted/50">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  <span>Workspace Members</span>
                  <Badge variant="secondary" className="text-xs">
                    {otherWorkspaceMembers.length}
                  </Badge>
                </div>
              </div>
              {otherWorkspaceMembers.map((user) => (
                <Button
                  key={user.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 rounded-none"
                  onClick={() => handleUserSelect(user.id)}
                  data-testid={`select-item-assignee-${user.id}`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </Button>
              ))}
            </>
          )}

          {organizationUsers.length === 0 && otherWorkspaceMembers.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'No members found' : 'No workspace members available'}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}





