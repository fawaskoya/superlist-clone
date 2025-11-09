import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface InvitationDetails {
  email: string;
  role: string;
  workspace: {
    id: string;
    name: string;
  };
  expiresAt: string;
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { switchWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [emailMismatch, setEmailMismatch] = useState(false);

  // Fetch invitation details
  const { data: invitation, isLoading, error } = useQuery<InvitationDetails>({
    queryKey: ['/api/invitations', token],
    enabled: !!token,
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/invitations/${token}/accept`, {}),
    onSuccess: async (data: any) => {
      toast({
        title: t('workspace.invitationAccepted'),
        description: t('workspace.invitationAcceptedDescription'),
      });
      
      // Invalidate workspaces query to refetch the list
      await queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      
      // Switch to the new workspace
      if (data.workspaceId) {
        switchWorkspace(data.workspaceId);
      }
      
      // Redirect to dashboard
      setTimeout(() => {
        setLocation('/dashboard');
      }, 1500);
    },
    onError: (error: any) => {
      if (error.message?.includes('different email')) {
        setEmailMismatch(true);
      } else {
        toast({
          title: t('workspace.invitationFailed'),
          description: error.message || t('common.error'),
          variant: 'destructive',
        });
      }
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      setLocation(`/login?redirect=/invite/${token}`);
    }
  }, [user, isLoading, token, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loading-spinner" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any).message || t('workspace.invitationNotFound');
    const isExpired = errorMessage.includes('expired');

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>{isExpired ? t('workspace.invitationExpired') : t('workspace.invitationNotFound')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <Button 
              className="w-full mt-4" 
              onClick={() => setLocation('/')}
              data-testid="button-go-home"
            >
              {t('common.goHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <CardTitle>{t('workspace.workspaceInvitation')}</CardTitle>
          </div>
          <CardDescription>
            {t('workspace.invitationDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailMismatch && (
            <Alert variant="destructive" data-testid="alert-email-mismatch">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('workspace.invitationEmailMismatch', {
                  invitedEmail: invitation.email,
                  yourEmail: user.email,
                })}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">{t('workspace.workspaceName')}</span>
              <span className="font-medium" data-testid="text-workspace-name">{invitation.workspace.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">{t('workspace.role')}</span>
              <span className="font-medium" data-testid="text-role">{t(`workspace.roles.${invitation.role.toLowerCase()}`)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">{t('common.email')}</span>
              <span className="font-medium" data-testid="text-email">{invitation.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">{t('common.expiresAt')}</span>
              <span className="text-sm" data-testid="text-expires">
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setLocation('/')}
              disabled={acceptMutation.isPending}
              data-testid="button-decline"
            >
              {t('common.decline')}
            </Button>
            <Button
              className="flex-1"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending || emailMismatch}
              data-testid="button-accept-invitation"
            >
              {acceptMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
              {t('workspace.acceptInvitation')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
