import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Users, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MembersTab } from './MembersTab';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceSettingsDialog({ open, onOpenChange }: WorkspaceSettingsDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const updateWorkspaceMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest('PATCH', `/api/workspaces/${currentWorkspace?.id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      toast({
        title: t('common.success'),
        description: t('workspace.updated'),
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

  const deleteWorkspaceMutation = useMutation({
    mutationFn: () =>
      apiRequest('DELETE', `/api/workspaces/${currentWorkspace?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      toast({
        title: t('common.success'),
        description: t('workspace.deleted'),
      });
      onOpenChange(false);
      window.location.href = '/dashboard';
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message,
      });
    },
  });

  const handleSaveName = () => {
    if (workspaceName.trim() && workspaceName !== currentWorkspace?.name) {
      updateWorkspaceMutation.mutate(workspaceName.trim());
    }
  };

  const handleDeleteWorkspace = () => {
    deleteWorkspaceMutation.mutate();
  };

  if (!currentWorkspace) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="dialog-workspace-settings">
          <DialogHeader>
            <DialogTitle>{t('workspace.workspaceSettings')}</DialogTitle>
            <DialogDescription>
              {t('workspace.manageWorkspaceSettings')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="gap-2" data-testid="tab-general">
                <Settings className="h-4 w-4" />
                {t('workspace.general')}
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2" data-testid="tab-members">
                <Users className="h-4 w-4" />
                {t('workspace.members')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 overflow-y-auto flex-1 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">{t('workspace.workspaceName')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="workspace-name"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder={t('workspace.workspaceName')}
                      data-testid="input-workspace-name"
                    />
                    <Button
                      onClick={handleSaveName}
                      disabled={!workspaceName.trim() || workspaceName === currentWorkspace.name || updateWorkspaceMutation.isPending}
                      data-testid="button-save-workspace-name"
                    >
                      {updateWorkspaceMutation.isPending ? t('common.loading') : t('common.save')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('workspace.workspaceId')}</Label>
                  <Input
                    value={currentWorkspace.id}
                    readOnly
                    className="bg-muted"
                    data-testid="text-workspace-id"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('workspace.createdAt')}</Label>
                  <Input
                    value={new Date(currentWorkspace.createdAt).toLocaleDateString()}
                    readOnly
                    className="bg-muted"
                    data-testid="text-workspace-created"
                  />
                </div>
              </div>

              <div className="pt-6 border-t">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-destructive">
                    {t('workspace.dangerZone')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('workspace.deleteWorkspaceWarning')}
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="gap-2"
                    data-testid="button-delete-workspace"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('workspace.deleteWorkspace')}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="members" className="overflow-y-auto flex-1 mt-6">
              <MembersTab workspaceId={currentWorkspace.id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workspace.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('workspace.deleteWorkspaceConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteWorkspaceMutation.isPending ? t('common.loading') : t('workspace.deleteWorkspace')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
