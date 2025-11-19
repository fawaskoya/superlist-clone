import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Sun, Sparkles, Plus } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { TaskItem } from '@/components/TaskItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@shared/schema';

interface MyDayTask {
  id: string;
  taskId: string;
  addedAt: string;
  task: Task & {
    assignedTo?: { id: string; name: string; email: string };
    list?: { id: string; name: string };
    workspace: { id: string; name: string };
  };
}

interface TaskSuggestion extends Task {
  assignedTo?: { id: string; name: string; email: string };
  list?: { id: string; name: string };
  workspace: { id: string; name: string };
}

export function MyDayPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();

  const { data: myDayTasks = [], isLoading: isLoadingMyDay } = useQuery<MyDayTask[]>({
    queryKey: ['/api/my-day'],
  });

  const { data: suggestionsData, isLoading: isLoadingSuggestions } = useQuery<{
    suggestions: TaskSuggestion[];
    count: number;
  }>({
    queryKey: ['/api/my-day/suggestions'],
  });

  const addToMyDayMutation = useMutation({
    mutationFn: (taskId: string) => apiRequest('POST', `/api/my-day/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-day'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-day/suggestions'] });
      toast({
        title: 'Added to My Day',
        description: 'Task has been added to your My Day',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add task to My Day',
      });
    },
  });

  const removeFromMyDayMutation = useMutation({
    mutationFn: (taskId: string) => apiRequest('DELETE', `/api/my-day/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-day'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-day/suggestions'] });
      toast({
        title: 'Removed from My Day',
        description: 'Task has been removed from your My Day',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to remove task from My Day',
      });
    },
  });

  const handleAddToMyDay = (taskId: string) => {
    addToMyDayMutation.mutate(taskId);
  };

  const handleRemoveFromMyDay = (taskId: string) => {
    removeFromMyDayMutation.mutate(taskId);
  };

  const currentTasks = myDayTasks.map(mt => mt.task);
  const suggestions = suggestionsData?.suggestions || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Sun className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">My Day</h1>
        </div>
        <p className="text-muted-foreground max-w-md mx-auto">
          Focus on what matters most today. Here's your personalized task list with AI-powered suggestions.
        </p>
        <div className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      {/* My Day Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Today's Focus ({currentTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingMyDay ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading your My Day tasks...
            </div>
          ) : currentTasks.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <Sun className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-medium">No tasks in My Day</h3>
                <p className="text-sm text-muted-foreground">
                  Add important tasks here to focus on what matters most today.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {currentTasks.map((task) => (
                <div key={task.id} className="relative">
                  <TaskItem
                    task={task}
                    onSelect={() => {/* TODO: Open task details */}}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFromMyDay(task.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={removeFromMyDayMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Suggestions ({suggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSuggestions ? (
              <div className="text-center py-4 text-muted-foreground">
                Finding the best tasks for you...
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.slice(0, 5).map((task) => (
                  <div key={task.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {task.dueDate && (
                            <Badge variant="secondary" className="text-xs">
                              Due {format(new Date(task.dueDate), 'MMM d')}
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              task.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                              task.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {task.priority}
                          </Badge>
                          {task.list && (
                            <Badge variant="outline" className="text-xs">
                              {task.list.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddToMyDay(task.id)}
                        disabled={addToMyDayMutation.isPending}
                        className="ml-2"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{currentTasks.length}</div>
              <p className="text-sm text-muted-foreground">Tasks in My Day</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentTasks.filter(t => t.status === 'DONE').length}
              </div>
              <p className="text-sm text-muted-foreground">Completed Today</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {suggestions.length}
              </div>
              <p className="text-sm text-muted-foreground">AI Suggestions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
