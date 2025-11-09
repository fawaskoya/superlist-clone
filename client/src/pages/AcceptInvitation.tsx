import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [emailMismatch, setEmailMismatch] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAttemptedAutoAccept, setHasAttemptedAutoAccept] = useState(false);

  // Fetch invitation details - this should work without auth
  const { data: invitation, isLoading: invitationLoading, error: invitationError } = useQuery<InvitationDetails>({
    queryKey: ['/api/invitations', token],
    enabled: !!token,
    retry: false,
    // Allow this query to work without authentication
    queryFn: async () => {
      const res = await fetch(`/api/invitations/${token}`);
      if (!res.ok) {
        try {
          const text = await res.text();
          const json = JSON.parse(text);
          throw new Error(json.message || text);
        } catch {
          const text = await res.text();
          throw new Error(`${res.status}: ${text}`);
        }
      }
      return res.json();
    },
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/invitations/${token}/accept`, {}),
    onSuccess: async (data: any) => {
      toast({
        title: t('workspace.invitationAccepted'),
        description: t('workspace.invitationAcceptedDescription'),
      });
      
      // Store workspace ID in localStorage for workspace context to pick up
      if (data.workspaceId && user?.id) {
        localStorage.setItem(`currentWorkspaceId:${user.id}`, data.workspaceId);
      }
      
      // Invalidate and refetch workspaces query to ensure new workspace is available
      await queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      await queryClient.refetchQueries({ queryKey: ['/api/workspaces'] });
      
      // Redirect to dashboard - workspace context will load the new workspace
      // Small delay to ensure workspace is loaded
      setTimeout(() => {
        setLocation('/dashboard');
      }, 500);
    },
    onError: (error: any) => {
      const errorMsg = error.message || t('common.error');
      
      // Check for email mismatch
      if (errorMsg.includes('different email') || (errorMsg.includes('403') && errorMsg.includes('email'))) {
        setEmailMismatch(true);
        setErrorMessage(errorMsg);
        setHasAttemptedAutoAccept(false); // Allow manual retry
      } else if (errorMsg.includes('401')) {
        // Not authenticated - shouldn't happen if we're checking properly
        setErrorMessage(t('workspace.invitationAuthRequired', { defaultValue: 'Please sign in to accept this invitation' }));
      } else {
        setErrorMessage(errorMsg);
        setHasAttemptedAutoAccept(false); // Allow manual retry
        toast({
          title: t('workspace.invitationFailed'),
          description: errorMsg,
          variant: 'destructive',
        });
      }
    },
  });

  // Auto-accept invitation when user logs in/registers with matching email
  useEffect(() => {
    // Only auto-accept if:
    // 1. User is authenticated
    // 2. Invitation is loaded
    // 3. We haven't already attempted auto-accept
    // 4. Not currently processing
    // 5. No email mismatch
    // 6. Auth is not loading (user state is stable)
    const shouldAutoAccept = 
      user && 
      invitation && 
      !authLoading &&
      !hasAttemptedAutoAccept &&
      !acceptMutation.isPending &&
      !acceptMutation.isSuccess &&
      !emailMismatch &&
      !errorMessage;

    if (shouldAutoAccept) {
      // Check if email matches
      if (user.email.toLowerCase() === invitation.email.toLowerCase()) {
        // Email matches - automatically accept
        setHasAttemptedAutoAccept(true);
        acceptMutation.mutate();
      } else {
        // Email doesn't match
        setEmailMismatch(true);
        setErrorMessage(t('workspace.invitationEmailMismatch', {
          invitedEmail: invitation.email,
          yourEmail: user.email,
        }));
    }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email, invitation?.email, authLoading, hasAttemptedAutoAccept, acceptMutation.isPending, acceptMutation.isSuccess, emailMismatch, errorMessage]);

  const isLoading = authLoading || invitationLoading;
  const error = invitationError;

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

  // Show invitation details even if not logged in
  if (!invitation) {
    return null;
  }

  // If user is not logged in, show invitation with login/register prompt
  if (!user && !authLoading) {
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
            <Alert data-testid="alert-login-required">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('workspace.invitationLoginRequired', { 
                  defaultValue: 'You\'ve been invited to join {{workspaceName}}. Sign in or create an account with {{email}} to accept.',
                  workspaceName: invitation.workspace.name,
                  email: invitation.email 
                })}
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
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

            <div className="flex flex-col gap-3 pt-4">
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => setLocation(`/register?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`)}
                  data-testid="button-register-to-accept"
                >
                  {t('auth.register')} ({invitation.email})
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation(`/login?redirect=/invite/${token}`)}
                  data-testid="button-login-to-accept"
                >
                  {t('auth.login')}
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setLocation('/')}
                data-testid="button-decline"
              >
                {t('common.decline')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is logged in - show invitation with accept/decline or auto-accepting state
  // If auto-accepting, show loading state
  if (acceptMutation.isPending && hasAttemptedAutoAccept) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <CardTitle>{t('workspace.acceptingInvitation', { defaultValue: 'Accepting Invitation...' })}</CardTitle>
            </div>
            <CardDescription>
              {t('workspace.acceptingInvitationDescription', { 
                defaultValue: 'Please wait while we add you to the workspace.',
                workspaceName: invitation.workspace.name 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('workspace.workspaceName')}</span>
                <span className="font-medium">{invitation.workspace.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('workspace.role')}</span>
                <span className="font-medium">{t(`workspace.roles.${invitation.role.toLowerCase()}`)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show email mismatch error with option to logout
  if (emailMismatch && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>{t('workspace.emailMismatch', { defaultValue: 'Email Mismatch' })}</CardTitle>
            </div>
            <CardDescription>
              {t('workspace.invitationDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive" data-testid="alert-email-mismatch">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage || t('workspace.invitationEmailMismatch', {
                  invitedEmail: invitation.email,
                  yourEmail: user.email,
                })}
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('workspace.workspaceName')}</span>
                <span className="font-medium">{invitation.workspace.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('workspace.role')}</span>
                <span className="font-medium">{t(`workspace.roles.${invitation.role.toLowerCase()}`)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('workspace.invitedEmail', { defaultValue: 'Invited Email' })}</span>
                <span className="font-medium">{invitation.email}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-muted-foreground">{t('workspace.yourEmail', { defaultValue: 'Your Email' })}</span>
                <span className="font-medium">{user.email}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button
                className="w-full"
                onClick={() => {
                  // Store invitation token before logout
                  localStorage.setItem('pendingInvitationToken', token!);
                  setLocation(`/login?redirect=/invite/${token}`);
                }}
                data-testid="button-login-with-correct-email"
              >
                {t('workspace.loginWithCorrectEmail', { defaultValue: `Sign in with ${invitation.email}` })}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation('/dashboard')}
                data-testid="button-go-to-dashboard"
              >
                {t('workspace.goToDashboard', { defaultValue: 'Go to Dashboard' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error message if there's an error (not email mismatch)
  if (errorMessage && !emailMismatch && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>{t('workspace.invitationError', { defaultValue: 'Invitation Error' })}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setErrorMessage(null);
                  setHasAttemptedAutoAccept(false);
                }}
                data-testid="button-retry"
              >
                {t('common.retry')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => setLocation('/dashboard')}
                data-testid="button-go-to-dashboard"
              >
                {t('common.goToDashboard', { defaultValue: 'Go to Dashboard' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is logged in and email matches - this should auto-accept, but show manual accept as fallback
  // This state should rarely be reached due to auto-accept, but it's a fallback
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
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
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
              onClick={() => setLocation('/dashboard')}
              disabled={acceptMutation.isPending}
              data-testid="button-decline"
            >
              {t('common.decline')}
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setHasAttemptedAutoAccept(true);
                acceptMutation.mutate();
              }}
              disabled={acceptMutation.isPending}
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
