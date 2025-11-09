import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Role } from '@shared/schema';

interface InviteMemberDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ workspaceId, open, onOpenChange }: InviteMemberDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: Role }) =>
      apiRequest('POST', `/api/workspaces/${workspaceId}/invitations`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspaceId, 'members'] });
      setInvitationLink(data.invitationLink);
      toast({
        title: t('common.success'),
        description: t('workspace.invitationSent'),
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || t('workspace.invitationFailed'),
      });
    },
  });

  const handleInvite = () => {
    if (!email.trim()) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('workspace.emailRequired'),
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('workspace.invalidEmail'),
      });
      return;
    }

    inviteMutation.mutate({ email: email.trim(), role });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setEmail('');
      setRole('MEMBER');
      setInvitationLink(null);
    }
    onOpenChange(newOpen);
  };

  const copyInviteLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      toast({
        title: t('common.success'),
        description: t('workspace.invitationLinkCopied'),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="dialog-invite-member">
        <DialogHeader>
          <DialogTitle>{t('workspace.inviteMember')}</DialogTitle>
          <DialogDescription>
            {invitationLink ? t('workspace.shareInvitationLink') : t('workspace.inviteMemberDescription')}
          </DialogDescription>
        </DialogHeader>

        {invitationLink ? (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <Label>{t('workspace.invitationLink')}</Label>
              <p className="text-sm text-muted-foreground">
                <Trans
                  i18nKey="workspace.invitationLinkNote"
                  values={{ email }}
                  components={{ bold: <strong className="font-semibold" /> }}
                />
              </p>
              <div className="flex gap-2">
                <Input
                  value={invitationLink}
                  readOnly
                  className="font-mono text-xs"
                  data-testid="input-invitation-link"
                />
                <Button onClick={copyInviteLink} variant="outline" data-testid="button-copy-link">
                  {t('common.copy')}
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{t('workspace.invitationProductionNote')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t('auth.email')}</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">{t('workspace.role')}</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger id="invite-role" data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t('workspace.roles.admin')}</SelectItem>
                  <SelectItem value="MEMBER">{t('workspace.roles.member')}</SelectItem>
                  <SelectItem value="VIEWER">{t('workspace.roles.viewer')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t(`workspace.roleDescriptions.${role.toLowerCase()}`)}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {invitationLink ? (
            <Button onClick={() => handleOpenChange(false)} data-testid="button-done">
              {t('common.done')}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                data-testid="button-cancel-invite"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviteMutation.isPending}
                data-testid="button-send-invite"
              >
                {inviteMutation.isPending ? t('common.loading') : t('workspace.sendInvitation')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
