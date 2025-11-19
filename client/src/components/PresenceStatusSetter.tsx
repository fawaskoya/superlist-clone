import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { UserPresenceBadge } from './UserPresenceBadge';

interface UserPresence {
  id: string;
  userId: string;
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
  customMessage?: string | null;
  lastSeen: string;
}

export function PresenceStatusSetter() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'>('ONLINE');
  const [customMessage, setCustomMessage] = useState('');

  // Fetch current presence
  const { data: currentPresence } = useQuery<UserPresence>({
    queryKey: ['/api/users/presence', { userIds: user?.id }],
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  // Update presence mutation
  const updatePresenceMutation = useMutation({
    mutationFn: (data: { status: string; customMessage?: string }) =>
      apiRequest('PUT', '/api/users/presence', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/users/presence', { userIds: user?.id }]
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/organization/users']
      });
      setIsOpen(false);
      toast({
        title: 'Status updated',
        description: 'Your presence status has been updated',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update presence',
      });
    },
  });

  const handleUpdatePresence = () => {
    updatePresenceMutation.mutate({
      status,
      customMessage: customMessage.trim() || undefined,
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return '🟢 Available';
      case 'AWAY':
        return '🟡 Away';
      case 'BUSY':
        return '🔴 Busy';
      case 'OFFLINE':
        return '⚫ Offline';
      default:
        return status;
    }
  };

  const quickStatuses = [
    { status: 'ONLINE' as const, label: 'Available', emoji: '🟢' },
    { status: 'AWAY' as const, label: 'Away', emoji: '🟡' },
    { status: 'BUSY' as const, label: 'Busy', emoji: '🔴' },
    { status: 'OFFLINE' as const, label: 'Offline', emoji: '⚫' },
  ];

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <UserPresenceBadge
            user={user}
            presence={currentPresence}
            size="sm"
            showName={false}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <UserPresenceBadge
              user={user}
              presence={currentPresence}
              size="md"
              showName={true}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Set your status</Label>

            {/* Quick status buttons */}
            <div className="grid grid-cols-2 gap-2">
              {quickStatuses.map((quickStatus) => (
                <Button
                  key={quickStatus.status}
                  variant={status === quickStatus.status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatus(quickStatus.status);
                    setCustomMessage('');
                  }}
                  className="justify-start"
                >
                  <span className="mr-2">{quickStatus.emoji}</span>
                  {quickStatus.label}
                </Button>
              ))}
            </div>

            {/* Custom status selector */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLINE">🟢 Available</SelectItem>
                  <SelectItem value="AWAY">🟡 Away</SelectItem>
                  <SelectItem value="BUSY">🔴 Busy</SelectItem>
                  <SelectItem value="OFFLINE">⚫ Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom message */}
            <div className="space-y-2">
              <Label htmlFor="message">Status message (optional)</Label>
              <Input
                id="message"
                placeholder="What's your status?"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                maxLength={100}
              />
              <div className="text-xs text-muted-foreground">
                {customMessage.length}/100 characters
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleUpdatePresence}
                disabled={updatePresenceMutation.isPending}
                className="flex-1"
              >
                {updatePresenceMutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
