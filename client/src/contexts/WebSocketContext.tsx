import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: 'connected' | 'task:created' | 'task:updated' | 'task:deleted' | 'list:created' | 'list:updated' | 'list:deleted' | 'workspace:updated' | 'notification:created';
  payload: any;
}

interface WebSocketContextType {
  connected: boolean;
  send: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const prevWorkspaceIdRef = useRef<string | null>(null);

  const connect = () => {
    if (!user) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Construct WebSocket URL properly for both local and Replit environments
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // This already includes the port if present
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Subscribe to current workspace
        if (currentWorkspace) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            payload: { workspaceId: currentWorkspace.id }
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        // Reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user) {
            connect();
          }
        }, delay);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket connected:', message.payload);
        break;

      case 'task:created':
        // Invalidate task queries
        queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
        queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
        break;

      case 'task:updated':
        // Invalidate task queries
        queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
        queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks', message.payload.id] });
        break;

      case 'task:deleted':
        // Invalidate task queries
        queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
        queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
        break;

      case 'list:created':
        queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
        break;

      case 'list:updated':
        queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
        break;

      case 'list:deleted':
        queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
        break;

      case 'workspace:updated':
        queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
        break;

      case 'notification:created':
        // Invalidate notifications query
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        break;
    }
  };

  const send = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  // Connect when user logs in
  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  // Subscribe/unsubscribe to workspace changes
  useEffect(() => {
    if (!currentWorkspace || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Unsubscribe from previous workspace if exists
    if (prevWorkspaceIdRef.current && prevWorkspaceIdRef.current !== currentWorkspace.id) {
      send({
        type: 'unsubscribe',
        payload: { workspaceId: prevWorkspaceIdRef.current }
      });
    }

    // Subscribe to new workspace
    send({
      type: 'subscribe',
      payload: { workspaceId: currentWorkspace.id }
    });

    // Update previous workspace reference
    prevWorkspaceIdRef.current = currentWorkspace.id;

    // Cleanup: unsubscribe when workspace changes or component unmounts
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        send({
          type: 'unsubscribe',
          payload: { workspaceId: currentWorkspace.id }
        });
      }
    };
  }, [currentWorkspace]);

  return (
    <WebSocketContext.Provider value={{ connected, send }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
