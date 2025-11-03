import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { InsertWorkspace } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function WorkspaceSwitcher() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', slug: '' });
  const { currentWorkspace, workspaces, switchWorkspace, isLoading } = useWorkspace();

  const createMutation = useMutation({
    mutationFn: (data: InsertWorkspace) => apiRequest('POST', '/api/workspaces', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      setDialogOpen(false);
      setNewWorkspace({ name: '', slug: '' });
      toast({
        title: t('common.success'),
        description: 'Workspace created successfully',
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

  const handleCreateWorkspace = () => {
    if (!newWorkspace.name || !newWorkspace.slug) return;
    createMutation.mutate(newWorkspace);
  };

  if (isLoading || !currentWorkspace) {
    return (
      <Button variant="ghost" className="h-9 px-3" disabled>
        <span className="text-sm font-medium">{t('common.loading')}</span>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 px-3 gap-2"
            data-testid="button-workspace-switcher"
          >
            <span className="text-sm font-medium">{currentWorkspace.name}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="start">
          {workspaces?.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              className="p-3"
              onClick={() => switchWorkspace(workspace.id)}
              data-testid={`menu-item-workspace-${workspace.id}`}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1">
                  <div className="font-medium">{workspace.name}</div>
                  <div className="text-xs text-muted-foreground">@{workspace.slug}</div>
                </div>
                {workspace.id === currentWorkspace?.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              setDialogOpen(true);
            }}
            className="p-3"
            data-testid="button-create-workspace"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('workspace.createWorkspace')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('workspace.createWorkspace')}</DialogTitle>
            <DialogDescription>
              Create a new workspace to organize your tasks and collaborate with your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('workspace.workspaceName')}</Label>
              <Input
                id="name"
                placeholder="My Team"
                value={newWorkspace.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  setNewWorkspace({ name, slug });
                }}
                data-testid="input-workspace-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="my-team"
                value={newWorkspace.slug}
                onChange={(e) => setNewWorkspace({ ...newWorkspace, slug: e.target.value })}
                data-testid="input-workspace-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreateWorkspace}
              disabled={createMutation.isPending || !newWorkspace.name || !newWorkspace.slug}
              data-testid="button-create-workspace-submit"
            >
              {createMutation.isPending ? t('common.loading') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
