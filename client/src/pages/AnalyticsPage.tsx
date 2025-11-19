import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Clock, TrendingUp, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface TimeEntry {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  task: {
    id: string;
    title: string;
    list: {
      id: string;
      name: string;
    } | null;
    workspace: {
      id: string;
      name: string;
    };
  };
}

interface AnalyticsData {
  totalDuration: number;
  entryCount: number;
  dailyStats: Record<string, { totalDuration: number; entries: TimeEntry[] }>;
  recentEntries: TimeEntry[];
}

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date()), 'yyyy-MM-dd'));

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/users', user?.id, 'time/analytics', { startDate, endDate }],
    enabled: !!user?.id,
  });

  const setDateRange = (range: 'week' | 'month' | 'custom') => {
    const now = new Date();
    switch (range) {
      case 'week':
        setStartDate(format(startOfWeek(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(now), 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Time Analytics</h1>
          <p className="text-muted-foreground mt-2">Loading your productivity insights...</p>
        </div>
      </div>
    );
  }

  const { totalDuration = 0, entryCount = 0, dailyStats = {}, recentEntries = [] } = analytics || {};

  // Calculate average daily time
  const daysWithData = Object.keys(dailyStats).length;
  const averageDaily = daysWithData > 0 ? totalDuration / daysWithData : 0;

  // Find most productive day
  const mostProductiveDay = Object.entries(dailyStats).reduce((max, [date, stats]) =>
    stats.totalDuration > (dailyStats[max]?.totalDuration || 0) ? date : max,
    ''
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <BarChart3 className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Time Analytics</h1>
        </div>
        <p className="text-muted-foreground max-w-md mx-auto">
          Track your productivity and understand how you spend your time.
        </p>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDateRange('week')}>
                This Week
              </Button>
              <Button variant="outline" onClick={() => setDateRange('month')}>
                This Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
                <p className="text-xs text-muted-foreground">Total Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{entryCount}</div>
                <p className="text-xs text-muted-foreground">Time Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{formatDuration(Math.floor(averageDaily))}</div>
                <p className="text-xs text-muted-foreground">Daily Average</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{daysWithData}</div>
                <p className="text-xs text-muted-foreground">Active Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      {Object.keys(dailyStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
            <CardDescription>
              Time tracked per day in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(dailyStats)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, stats]) => (
                  <div key={date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{formatDate(date)}</div>
                      <div className="text-sm text-muted-foreground">
                        {stats.entries.length} session{stats.entries.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold">
                        {formatDuration(stats.totalDuration)}
                      </div>
                      {date === mostProductiveDay && (
                        <Badge variant="secondary" className="text-xs">
                          Most Productive
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
            <CardDescription>
              Your latest time tracking sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium truncate">{entry.task.title}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{entry.task.workspace.name}</span>
                      {entry.task.list && (
                        <>
                          <span>•</span>
                          <span>{entry.task.list.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{format(new Date(entry.startTime), 'MMM d, HH:mm')}</span>
                      {entry.endTime && (
                        <>
                          <span>-</span>
                          <span>{format(new Date(entry.endTime), 'HH:mm')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono">
                      {entry.duration ? formatDuration(entry.duration) : 'In progress'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {entryCount === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No Time Data Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking time on your tasks to see analytics here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}




