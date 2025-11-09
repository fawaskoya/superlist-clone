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

// Use JWT_SECRET with fallback to SESSION_SECRET for backwards compatibility
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback_secret';

function log(message: string, level: 'info' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [WebSocket]`;
  const logMessage = `${prefix} ${message}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
  }
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private userClients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  initialize(server: Server) {
    try {
      this.wss = new WebSocketServer({ server, path: '/ws' });
      log('WebSocket server initialized on path /ws');

      this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const token = url.searchParams.get('token');

          if (!token) {
            log('WebSocket connection rejected: No token provided', 'warn');
            ws.close(1008, 'No token provided');
            return;
          }

          try {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
            
            if (!decoded.userId) {
              log('WebSocket connection rejected: Token missing userId', 'warn');
              ws.close(1008, 'Invalid token format');
              return;
            }

            ws.userId = decoded.userId;
            ws.workspaceIds = new Set();

            // Track user connection
            if (!this.userClients.has(ws.userId)) {
              this.userClients.set(ws.userId, new Set());
            }
            this.userClients.get(ws.userId)?.add(ws);
            log(`WebSocket client connected: userId=${ws.userId}`);

            ws.on('message', (data: string) => {
              try {
                const message: WSMessage = JSON.parse(data.toString());
                log(`Received message from ${ws.userId}: ${message.type}`);
                this.handleMessage(ws, message);
              } catch (error) {
                log(`Error processing WebSocket message from ${ws.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                try {
                  ws.send(JSON.stringify({ 
                    type: 'error', 
                    payload: { message: 'Invalid message format' } 
                  }));
                } catch (sendError) {
                  log(`Error sending error message: ${sendError instanceof Error ? sendError.message : 'Unknown error'}`, 'error');
                }
              }
            });

            ws.on('error', (error) => {
              log(`WebSocket error for userId=${ws.userId}: ${error.message}`, 'error');
            });

            ws.on('close', (code, reason) => {
              if (ws.userId) {
                log(`WebSocket client disconnected: userId=${ws.userId}, code=${code}, reason=${reason.toString()}`);
                ws.workspaceIds?.forEach(workspaceId => {
                  this.clients.get(workspaceId)?.delete(ws);
                });
                this.userClients.get(ws.userId)?.delete(ws);
              }
            });

            ws.send(JSON.stringify({ type: 'connected', payload: { userId: ws.userId } }));
          } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
              log('WebSocket connection rejected: Token expired', 'warn');
              ws.close(1008, 'Token expired');
            } else if (error instanceof jwt.JsonWebTokenError) {
              log(`WebSocket connection rejected: Invalid token - ${error.message}`, 'warn');
              ws.close(1008, 'Invalid token');
            } else {
              log(`WebSocket connection error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
              ws.close(1011, 'Internal server error');
            }
          }
        } catch (error) {
          log(`Error setting up WebSocket connection: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          ws.close(1011, 'Connection setup error');
        }
      });

      this.wss.on('error', (error) => {
        log(`WebSocket server error: ${error.message}`, 'error');
      });
    } catch (error) {
      log(`Error initializing WebSocket server: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: WSMessage) {
    try {
      switch (message.type) {
        case 'subscribe':
          const workspaceId = message.payload?.workspaceId;
          if (!workspaceId) {
            log(`Subscribe message missing workspaceId from userId=${ws.userId}`, 'warn');
            return;
          }
          if (!ws.userId) {
            log('Subscribe message received from unauthenticated client', 'warn');
            return;
          }
          ws.workspaceIds?.add(workspaceId);
          if (!this.clients.has(workspaceId)) {
            this.clients.set(workspaceId, new Set());
          }
          this.clients.get(workspaceId)?.add(ws);
          log(`User ${ws.userId} subscribed to workspace ${workspaceId}`);
          break;
        case 'unsubscribe':
          const wsId = message.payload?.workspaceId;
          if (!wsId) {
            log(`Unsubscribe message missing workspaceId from userId=${ws.userId}`, 'warn');
            return;
          }
          if (!ws.userId) {
            log('Unsubscribe message received from unauthenticated client', 'warn');
            return;
          }
          ws.workspaceIds?.delete(wsId);
          this.clients.get(wsId)?.delete(ws);
          log(`User ${ws.userId} unsubscribed from workspace ${wsId}`);
          break;
        default:
          log(`Unknown message type: ${message.type} from userId=${ws.userId}`, 'warn');
      }
    } catch (error) {
      log(`Error handling message: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  broadcast(workspaceId: string, message: WSMessage, excludeUserId?: string) {
    try {
      const clients = this.clients.get(workspaceId);
      if (!clients || clients.size === 0) {
        log(`No clients subscribed to workspace ${workspaceId}`, 'info');
        return;
      }

      const messageStr = JSON.stringify(message);
      let sentCount = 0;
      clients.forEach(client => {
        try {
          if (client.readyState === WebSocket.OPEN && client.userId !== excludeUserId) {
            client.send(messageStr);
            sentCount++;
          }
        } catch (error) {
          log(`Error sending message to client ${client.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      });
      log(`Broadcasted ${message.type} to ${sentCount} client(s) in workspace ${workspaceId}`);
    } catch (error) {
      log(`Error broadcasting message: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
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
    try {
      const clients = this.userClients.get(userId);
      if (!clients || clients.size === 0) {
        log(`No WebSocket clients found for user ${userId}`, 'info');
        return;
      }

      const messageStr = JSON.stringify(message);
      let sentCount = 0;
      clients.forEach(client => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
            sentCount++;
          }
        } catch (error) {
          log(`Error sending message to user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      });
      log(`Broadcasted to ${sentCount} client(s) for user ${userId}`);
    } catch (error) {
      log(`Error broadcasting to user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }
}

export const wsManager = new WebSocketManager();
