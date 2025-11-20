import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Clock, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  presence?: {
    status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
    customMessage?: string;
    lastSeen: string;
  };
}

interface OrganizationUserSearchProps {
  onUserSelect?: (user: OrganizationUser) => void;
  onChatStart?: (user: OrganizationUser) => void;
  placeholder?: string;
  showActions?: boolean;
  className?: string;
}

export function OrganizationUserSearch({
  onUserSelect,
  onChatStart,
  placeholder = "Search organization members...",
  showActions = true,
  className = ""
}: OrganizationUserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const { toast } = useToast();

  // Fetch all organization users
  const { data: allUsers, isLoading: isLoadingAll } = useQuery({
    queryKey: ['/api/organization/users'],
    queryFn: async () => {
      const response = await fetch('/api/organization/users');
      if (!response.ok) {
        throw new Error('Failed to fetch organization users');
      }
      return response.json() as Promise<OrganizationUser[]>;
    },
  });

  // Search organization users
  const { data: searchResults, isLoading: isLoadingSearch } = useQuery({
    queryKey: ['/api/organization/users/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      const response = await fetch(`/api/organization/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Failed to search organization users');
      }
      return response.json() as Promise<OrganizationUser[]>;
    },
    enabled: searchQuery.length >= 2,
  });

  const displayedUsers = useMemo(() => {
    if (searchQuery.length >= 2) {
      return searchResults || [];
    }
    return allUsers?.slice(0, 10) || []; // Show first 10 users when not searching
  }, [searchQuery, searchResults, allUsers]);

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

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleUserSelect = (user: OrganizationUser) => {
    setSelectedUser(user);
    onUserSelect?.(user);
  };

  const handleChatStart = async (user: OrganizationUser) => {
    try {
      // For now, we'll just show a toast since chat functionality needs to be implemented
      toast({
        title: "Chat feature coming soon",
        description: `Chat with ${user.name} will be available soon!`,
      });
      onChatStart?.(user);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoadingAll || (isLoadingSearch && searchQuery.length >= 2) ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {displayedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery.length >= 2
                ? `No organization members found for "${searchQuery}"`
                : "No organization members found"
              }
            </div>
          ) : (
            displayedUsers.map((user) => (
              <Card key={user.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${getPresenceColor(user.presence?.status)}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {getPresenceText(user.presence?.status)}
                          </Badge>
                          {user.presence?.status !== 'ONLINE' && user.presence?.lastSeen && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatLastSeen(user.presence.lastSeen)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {showActions && (
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserSelect(user)}
                          className="h-8 px-2"
                        >
                          Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChatStart(user)}
                          className="h-8 px-2"
                        >
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {searchQuery.length >= 2 && searchResults && searchResults.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Try searching with a different name or email
        </div>
      )}
    </div>
  );
}





