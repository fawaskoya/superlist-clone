import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: 'connected' | 'task:created' | 'task:updated' | 'task:deleted' | 'list:created' | 'list:updated' | 'list:deleted' | 'workspace:updated' | 'notification:created' | 'message:created' | 'channel:updated' | 'subscribe_channel' | 'unsubscribe_channel' | 'call:initiate' | 'call:answer' | 'call:ice-candidate' | 'call:end' | 'call:incoming';
  payload: any;
}

interface WebSocketContextType {
  connected: boolean;
  send: (message: any) => void;
  onMessage: (handler: (message: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Simple function to build WebSocket URL
const buildWebSocketUrl = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  const isSecure = window.location.protocol === 'https:';
  const protocol = isSecure ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const port = window.location.port;

  // For localhost, always use port 3001
  // For other hosts, use the same port as the current page (or default to 80/443)
  if (hostname === 'localhost') {
    return `${protocol}//localhost:3001/ws?token=${encodeURIComponent(token)}`;
  } else {
    // If no port is specified, use default ports
    const defaultPort = isSecure ? 443 : 80;
    const actualPort = port && port !== '80' && port !== '443' ? port : (isSecure ? '443' : '80');
    const portPart = actualPort !== '80' && actualPort !== '443' ? `:${actualPort}` : '';
    return `${protocol}//${hostname}${portPart}/ws?token=${encodeURIComponent(token)}`;
  }
};

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const prevWorkspaceIdRef = useRef<string | null>(null);
  const messageHandlersRef = useRef<Set<(message: any) => void>>(new Set());

  const connect = () => {
    if (!user) {
      console.log('[WebSocket] No user, skipping connection');
      return;
    }

    const wsUrl = buildWebSocketUrl();
    if (!wsUrl) {
      console.log('[WebSocket] No token available, skipping connection');
      return;
    }

    console.log('[WebSocket] Connecting to:', wsUrl.replace(/token=[^&]*/, 'token=***'));

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
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

          // Call all registered message handlers
          messageHandlersRef.current.forEach(handler => {
            try {
              handler(message);
            } catch (error) {
              console.error('[WebSocket] Error in message handler:', error);
            }
          });
        } catch (error) {
          console.error('[WebSocket] Message parse error:', error, 'Raw data:', event.data);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setConnected(false);
        wsRef.current = null;

        // Don't reconnect if it was a clean close (e.g., logout)
        if (event.code === 1000) {
          return;
        }

        // Reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (user) {
            connect();
          }
        }, delay);
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to create WebSocket connection:', error);
      setConnected(false);
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
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

      case 'message:created':
        // Invalidate channel messages
        queryClient.invalidateQueries({
          queryKey: ['/api/channels', message.payload?.channelId, 'messages']
        });
        queryClient.invalidateQueries({
          queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels']
        });
        break;

      case 'channel:updated':
        queryClient.invalidateQueries({
          queryKey: ['/api/workspaces', currentWorkspace?.id, 'channels']
        });
        break;

      case 'presence:updated':
        // Handle presence updates from other users
        console.log('[WebSocket] Presence updated:', message.payload);
        queryClient.invalidateQueries({
          queryKey: ['/api/users/presence']
        });
        queryClient.invalidateQueries({
          queryKey: ['/api/organization/users']
        });
        break;

      case 'call:incoming':
        // Handle incoming call notifications
        console.log('[WebSocket] Incoming call:', message.payload);
        // This will be handled by a global call notification component
        break;
    }
  };

  const send = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const onMessage = useCallback((handler: (message: any) => void) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

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
    <WebSocketContext.Provider value={{ connected, send, onMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    // Fallback when WebSocketProvider is disabled
    console.log('[WebSocket] WebSocketProvider disabled, using fallback');
    return {
      connected: false,
      send: () => {
        console.log('[WebSocket] Send disabled - WebSocket not available');
      },
      onMessage: () => () => {
        console.log('[WebSocket] onMessage disabled - WebSocket not available');
      }
    };
  }
  return context;
}
