import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, CheckCircle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  checklistItems: string[] | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface TaskTemplateSelectorProps {
  onSelectTemplate: (template: TaskTemplate) => void;
  onCreateTask?: (data: { title: string; description?: string; priority?: string }) => void;
}

export function TaskTemplateSelector({ onSelectTemplate, onCreateTask }: TaskTemplateSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplatePriority, setNewTemplatePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const { data: templates = [], isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'templates'],
    enabled: !!currentWorkspace?.id,
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      defaultPriority: string;
      checklistItems: string[];
      workspaceId: string;
    }) => apiRequest('POST', '/api/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/workspaces', currentWorkspace?.id, 'templates']
      });
      setIsCreateDialogOpen(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      setNewTemplatePriority('MEDIUM');
      setChecklistItems([]);
      toast({
        title: 'Template created',
        description: 'Your task template has been saved',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create template',
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) => apiRequest('DELETE', `/api/templates/${templateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/workspaces', currentWorkspace?.id, 'templates']
      });
      toast({
        title: 'Template deleted',
        description: 'The template has been removed',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete template',
      });
    },
  });

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim() || !currentWorkspace) return;

    createTemplateMutation.mutate({
      name: newTemplateName.trim(),
      description: newTemplateDescription.trim(),
      defaultPriority: newTemplatePriority,
      checklistItems: checklistItems.filter(item => item.trim()),
      workspaceId: currentWorkspace.id,
    });
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleUseTemplate = (template: TaskTemplate) => {
    onSelectTemplate(template);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Task Templates</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Task Template</DialogTitle>
              <DialogDescription>
                Create a reusable template for common task types.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Bug Report, Feature Request"
                />
              </div>

              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Describe when to use this template"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="template-priority">Default Priority</Label>
                <Select value={newTemplatePriority} onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') => setNewTemplatePriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Checklist Items</Label>
                <div className="space-y-2">
                  {checklistItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-1 text-sm">{item}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveChecklistItem(index)}
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Add checklist item"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddChecklistItem}
                      disabled={!newChecklistItem.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateTemplate}
                disabled={!newTemplateName.trim() || createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No templates yet. Create your first template to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="text-sm mt-1">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplateMutation.mutate(template.id);
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    disabled={deleteTemplateMutation.isPending}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        template.defaultPriority === 'HIGH' ? 'bg-red-100 text-red-700' :
                        template.defaultPriority === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {template.defaultPriority}
                    </Badge>
                    {template.checklistItems && template.checklistItems.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {template.checklistItems.length} items
                      </Badge>
                    )}
                  </div>

                  {template.checklistItems && template.checklistItems.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Checklist: {template.checklistItems.slice(0, 2).join(', ')}
                      {template.checklistItems.length > 2 && ` +${template.checklistItems.length - 2} more`}
                    </div>
                  )}

                  <Button
                    onClick={() => handleUseTemplate(template)}
                    className="w-full"
                    size="sm"
                  >
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}




