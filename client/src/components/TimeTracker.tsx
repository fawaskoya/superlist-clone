import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Square, Clock, BarChart3 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { format, formatDistance } from 'date-fns';

interface TimeEntry {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TimeTrackerProps {
  taskId: string;
}

export function TimeTracker({ taskId }: TimeTrackerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(0);

  const { data: timeData, isLoading } = useQuery<{
    entries: TimeEntry[];
    totalDuration: number;
    activeEntry: TimeEntry | null;
  }>({
    queryKey: ['/api/tasks', taskId, 'time'],
    refetchInterval: (data) => {
      // Refetch every second if there's an active timer
      return data?.activeEntry ? 1000 : false;
    },
  });

  // Update current time display for active entries
  useEffect(() => {
    if (timeData?.activeEntry) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(timeData.activeEntry!.startTime).getTime()) / 1000);
        setCurrentTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCurrentTime(0);
    }
  }, [timeData?.activeEntry]);

  const startTimeMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/tasks/${taskId}/time/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'time'] });
      toast({
        title: 'Timer started',
        description: 'Time tracking has begun for this task',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to start timer',
      });
    },
  });

  const stopTimeMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/tasks/${taskId}/time/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'time'] });
      toast({
        title: 'Timer stopped',
        description: 'Time tracking has been stopped',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to stop timer',
      });
    },
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">Loading time tracking...</div>
      </div>
    );
  }

  const { entries = [], totalDuration = 0, activeEntry } = timeData || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span className="font-medium">Time Tracking</span>
      </div>

      {/* Timer Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-mono font-bold">
                {activeEntry ? formatDuration(currentTime) : formatTotalDuration(totalDuration)}
              </div>
              <div className="text-sm text-muted-foreground">
                {activeEntry ? 'Currently tracking' : `Total time: ${formatTotalDuration(totalDuration)}`}
              </div>
            </div>
            <div className="flex gap-2">
              {!activeEntry ? (
                <Button
                  onClick={() => startTimeMutation.mutate()}
                  disabled={startTimeMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Timer
                </Button>
              ) : (
                <Button
                  onClick={() => stopTimeMutation.mutate()}
                  disabled={stopTimeMutation.isPending}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop Timer
                </Button>
              )}
            </div>
          </div>

          {activeEntry && (
            <div className="text-sm text-muted-foreground">
              Started {formatDistance(new Date(activeEntry.startTime), new Date(), { addSuffix: true })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Time Entries ({entries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {format(new Date(entry.startTime), 'MMM d, HH:mm')}
                      </span>
                      {entry.endTime && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm font-medium">
                            {format(new Date(entry.endTime), 'HH:mm')}
                          </span>
                        </>
                      )}
                      {!entry.endTime && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.user.name}
                    </div>
                  </div>
                  <div className="text-right">
                    {entry.duration ? (
                      <div className="text-sm font-mono">
                        {formatDuration(entry.duration)}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        In progress
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {entries.length > 5 && (
                <div className="text-center text-sm text-muted-foreground">
                  And {entries.length - 5} more entries...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && !activeEntry && (
        <div className="text-center py-6 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No time tracked yet. Start the timer to begin tracking time on this task.</p>
        </div>
      )}
    </div>
  );
}




