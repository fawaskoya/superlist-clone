import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  workspaceIds?: Set<string>;
}

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'task:created' | 'task:updated' | 'task:deleted' | 'list:created' | 'list:updated' | 'list:deleted' | 'workspace:updated';
  payload: any;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private userClients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(1008, 'No token provided');
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };
        ws.userId = decoded.userId;
        ws.workspaceIds = new Set();

        // Track user connection
        if (!this.userClients.has(ws.userId)) {
          this.userClients.set(ws.userId, new Set());
        }
        this.userClients.get(ws.userId)?.add(ws);

        ws.on('message', (data: string) => {
          try {
            const message: WSMessage = JSON.parse(data.toString());
            this.handleMessage(ws, message);
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        });

        ws.on('close', () => {
          if (ws.userId) {
            ws.workspaceIds?.forEach(workspaceId => {
              this.clients.get(workspaceId)?.delete(ws);
            });
            this.userClients.get(ws.userId)?.delete(ws);
          }
        });

        ws.send(JSON.stringify({ type: 'connected', payload: { userId: ws.userId } }));
      } catch (error) {
        ws.close(1008, 'Invalid token');
      }
    });
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: WSMessage) {
    switch (message.type) {
      case 'subscribe':
        const workspaceId = message.payload.workspaceId;
        if (workspaceId && ws.userId) {
          ws.workspaceIds?.add(workspaceId);
          if (!this.clients.has(workspaceId)) {
            this.clients.set(workspaceId, new Set());
          }
          this.clients.get(workspaceId)?.add(ws);
        }
        break;
      case 'unsubscribe':
        const wsId = message.payload.workspaceId;
        if (wsId && ws.userId) {
          ws.workspaceIds?.delete(wsId);
          this.clients.get(wsId)?.delete(ws);
        }
        break;
    }
  }

  broadcast(workspaceId: string, message: WSMessage, excludeUserId?: string) {
    const clients = this.clients.get(workspaceId);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.userId !== excludeUserId) {
        client.send(messageStr);
      }
    });
  }

  broadcastTaskCreated(workspaceId: string, task: any, userId?: string) {
    this.broadcast(workspaceId, {
      type: 'task:created',
      payload: task
    }, userId);
  }

  broadcastTaskUpdated(workspaceId: string, task: any, userId?: string) {
    this.broadcast(workspaceId, {
      type: 'task:updated',
      payload: task
    }, userId);
  }

  broadcastTaskDeleted(workspaceId: string, taskId: string, userId?: string) {
    this.broadcast(workspaceId, {
      type: 'task:deleted',
      payload: { id: taskId }
    }, userId);
  }

  broadcastListCreated(workspaceId: string, list: any, userId?: string) {
    this.broadcast(workspaceId, {
      type: 'list:created',
      payload: list
    }, userId);
  }

  broadcastListUpdated(workspaceId: string, list: any, userId?: string) {
    this.broadcast(workspaceId, {
      type: 'list:updated',
      payload: list
    }, userId);
  }

  broadcastListDeleted(workspaceId: string, listId: string, userId?: string) {
    this.broadcast(workspaceId, {
      type: 'list:deleted',
      payload: { id: listId }
    }, userId);
  }

  broadcastWorkspaceUpdated(workspaceId: string, workspace: any, userId?: string) {
    this.broadcast(workspaceId, {
      type: 'workspace:updated',
      payload: workspace
    }, userId);
  }

  // Broadcast to a specific user
  broadcastToUser(userId: string, message: any) {
    const clients = this.userClients.get(userId);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

export const wsManager = new WebSocketManager();
