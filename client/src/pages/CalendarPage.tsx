import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Clock, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  createdAt: string;
  list: {
    id: string;
    name: string;
  };
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  type: 'MEETING' | 'EVENT' | 'REMINDER' | 'APPOINTMENT';
  startTime: string;
  endTime?: string;
  allDay: boolean;
  location?: string;
  attendees: string[];
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

type ViewType = 'month' | 'week' | 'day';

export function CalendarPage() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');

  // Calculate date range for current view
  const dateRange = useMemo(() => {
    let startDate: Date;
    let endDate: Date;

    if (viewType === 'month') {
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
    } else if (viewType === 'week') {
      startDate = startOfWeek(currentDate);
      endDate = endOfWeek(currentDate);
    } else { // day view
      startDate = startOfDay(currentDate);
      endDate = endOfWeek(currentDate); // Show full week for day view to get context
    }

    const range = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return range;
  }, [currentDate, viewType]);

  // Fetch tasks for the current month/week
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'tasks/calendar', { startDate: dateRange.startDate, endDate: dateRange.endDate }],
    enabled: !!currentWorkspace?.id,
  });


  // Fetch events for the current month/week
  const { data: events = [] } = useQuery<Meeting[]>({
    queryKey: ['/api/workspaces', currentWorkspace?.id, 'events', { startDate: dateRange.startDate, endDate: dateRange.endDate }],
    enabled: !!currentWorkspace?.id,
  });

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = startOfDay(new Date(task.dueDate)).toISOString().split('T')[0];
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Meeting[]> = {};
    events.forEach(event => {
      const dateKey = startOfDay(new Date(event.startTime)).toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push({
        ...event,
        attendees: Array.isArray(event.attendees) ? event.attendees : JSON.parse(event.attendees || '[]')
      });
    });
    return grouped;
  }, [events]);

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewType === 'month') {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    } else if (viewType === 'week') {
      setCurrentDate(prev => addDays(prev, direction === 'next' ? 7 : -7));
    } else {
      setCurrentDate(prev => addDays(prev, direction === 'next' ? 1 : -1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '#ef4444'; // red-500
      case 'MEDIUM': return '#eab308'; // yellow-500
      case 'LOW': return '#22c55e'; // green-500
      default: return '#6b7280'; // gray-500
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isCurrentMonth = isSameMonth(day, monthStart);

        const dayKey = day.toISOString().split('T')[0];
        const dayTasks = tasksByDate[dayKey] || [];
        const dayEvents = eventsByDate[dayKey] || [];
        const allItems = [...dayTasks, ...dayEvents].sort((a, b) => {
          const aTime = 'dueDate' in a ? new Date(a.dueDate) : new Date(a.startTime);
          const bTime = 'dueDate' in b ? new Date(b.dueDate) : new Date(b.startTime);
          return aTime.getTime() - bTime.getTime();
        });


        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] p-2 border border-border/50 ${
              !isCurrentMonth ? 'bg-muted/20' : 'bg-background'
            } ${isSameDay(day, new Date()) ? 'bg-primary/5 border-primary/20' : ''}`}
          >
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {format(day, dateFormat)}
            </div>
            <div className="space-y-1">
              {allItems.slice(0, 4).map(item => {
                if ('dueDate' in item) {
                  // It's a task
                  const task = item;
                  return (
                    <div
                      key={task.id}
                      className={`text-xs p-1 rounded truncate ${
                        task.status === 'DONE' ? 'line-through text-muted-foreground bg-muted' : ''
                      } ${task.status !== 'DONE' ? 'text-white' : ''}`}
                      style={{
                        backgroundColor: task.status === 'DONE' ? undefined : getPriorityColor(task.priority),
                        borderLeft: task.status === 'DONE' ? undefined : `2px solid ${getPriorityColor(task.priority)}`
                      }}
                      title={task.title}
                    >
                      📋 {task.title}
                    </div>
                  );
                } else {
                  // It's an event
                  const event = item;
                  return (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded truncate bg-blue-100 text-blue-800 border-l-2 border-l-blue-500"
                      title={`${event.title}${event.location ? ` @ ${event.location}` : ''}`}
                    >
                      📅 {event.title}
                    </div>
                  );
                }
              })}
              {allItems.length > 4 && (
                <div className="text-xs text-muted-foreground">
                  +{allItems.length - 4} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="space-y-1">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-border/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center font-medium text-sm">
              {day}
            </div>
          ))}
        </div>
        {/* Days */}
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayTasks = tasksByDate[day.toISOString().split('T')[0]] || [];
      const isToday = isSameDay(day, new Date());

      weekDays.push(
        <div key={day.toString()} className="flex-1 border-r border-border/50 last:border-r-0">
          <div className={`p-3 border-b border-border/50 ${isToday ? 'bg-primary/5' : ''}`}>
            <div className="text-center">
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-2 space-y-2">
              {dayTasks.map(task => (
                <div
                  key={task.id}
                  className={`p-2 rounded border-l-2 text-xs ${
                    task.status === 'DONE' ? 'line-through text-muted-foreground bg-muted/50' : ''
                  }`}
                  style={{
                    borderLeftColor: getPriorityColor(task.priority),
                    backgroundColor: task.status === 'DONE' ? undefined : `${getPriorityColor(task.priority)}1A` // 10% opacity
                  }}
                >
                  <div className="font-medium truncate">{task.title}</div>
                  <div className="text-muted-foreground truncate">{task.list.name}</div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {task.priority}
                  </Badge>
                </div>
              ))}
              {dayTasks.length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-4">
                  No tasks
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      );
    }

    return (
      <div className="flex h-[500px]">
        {weekDays}
      </div>
    );
  };

  const renderDayView = () => {
    const dayTasks = tasksByDate[currentDate.toISOString().split('T')[0]] || [];
    const isToday = isSameDay(currentDate, new Date());

    return (
      <div className="space-y-4">
        <div className={`p-6 rounded-lg border ${isToday ? 'bg-primary/5 border-primary/20' : 'bg-muted/20'}`}>
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </div>
            {isToday && (
              <Badge variant="secondary" className="mb-2">Today</Badge>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {dayTasks.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No tasks scheduled</h3>
                <p className="text-muted-foreground">
                  Tasks with due dates will appear here
                </p>
              </div>
            ) : (
              dayTasks.map(task => (
                <Card key={task.id} className={task.status === 'DONE' ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                          />
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                          <Badge
                            variant={task.status === 'DONE' ? 'secondary' : 'default'}
                            className="text-xs"
                          >
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <h4 className={`font-medium ${task.status === 'DONE' ? 'line-through' : ''}`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {task.list.name}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            View your tasks and schedule in calendar format
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Showing {tasks.length} tasks for {format(currentDate, 'MMMM yyyy')}
            </p>
          )}
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-center">
                <h2 className="text-xl font-semibold">
                  {viewType === 'month' && format(currentDate, 'MMMM yyyy')}
                  {viewType === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d')}`}
                  {viewType === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
                </h2>
              </div>

              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewType === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('month')}
              >
                Month
              </Button>
              <Button
                variant={viewType === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('week')}
              >
                Week
              </Button>
              <Button
                variant={viewType === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('day')}
              >
                Day
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {viewType === 'month' && renderMonthView()}
          {viewType === 'week' && renderWeekView()}
          {viewType === 'day' && renderDayView()}
        </CardContent>
      </Card>

      {/* Upcoming Items Sidebar */}
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {/* Upcoming Tasks */}
              {tasks.filter(task => task.dueDate && new Date(task.dueDate) >= new Date() && task.status !== 'DONE').length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    📋 Tasks
                  </h4>
                  <div className="space-y-2">
                    {tasks
                      .filter(task => task.dueDate && new Date(task.dueDate) >= new Date() && task.status !== 'DONE')
                      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                      .slice(0, 5)
                      .map(task => (
                        <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg border border-border/50">
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{task.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {task.list?.name || 'No List'} • Due {format(new Date(task.dueDate!), 'MMM d')}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Upcoming Events */}
              {events.filter(event => new Date(event.startTime) >= new Date()).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    📅 Events
                  </h4>
                  <div className="space-y-2">
                    {events
                      .filter(event => new Date(event.startTime) >= new Date())
                      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                      .slice(0, 5)
                      .map(event => (
                        <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg border border-border/50 bg-blue-50/50">
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-blue-500" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{event.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(event.startTime), 'MMM d, h:mm a')}
                              {event.location && ` • ${event.location}`}
                            </div>
                            {event.attendees.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* No upcoming items */}
              {tasks.filter(task => task.dueDate && new Date(task.dueDate) >= new Date() && task.status !== 'DONE').length === 0 &&
               events.filter(event => new Date(event.startTime) >= new Date()).length === 0 && (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No upcoming items</h3>
                  <p className="text-muted-foreground text-sm">
                    Tasks and events with future dates will appear here
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
