import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  workspaceIds?: Set<string>;
  channelIds?: Set<string>;
}

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'subscribe_channel' | 'unsubscribe_channel' | 'task:created' | 'task:updated' | 'task:deleted' | 'list:created' | 'list:updated' | 'list:deleted' | 'workspace:updated' | 'message:created' | 'channel:updated' | 'call:initiate' | 'call:answer' | 'call:ice-candidate' | 'call:end' | 'call:incoming';
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
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map(); // workspaceId -> clients
  private channelClients: Map<string, Set<AuthenticatedWebSocket>> = new Map(); // channelId -> clients
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
        ws.channelIds = new Set();

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
        case 'subscribe_channel':
          const channelId = message.payload?.channelId;
          if (!channelId) {
            log(`Subscribe channel message missing channelId from userId=${ws.userId}`, 'warn');
            return;
          }
          if (!ws.userId) {
            log('Subscribe channel message received from unauthenticated client', 'warn');
            return;
          }
          ws.channelIds?.add(channelId);
          if (!this.channelClients.has(channelId)) {
            this.channelClients.set(channelId, new Set());
          }
          this.channelClients.get(channelId)?.add(ws);
          log(`User ${ws.userId} subscribed to channel ${channelId}`);
          break;
        case 'unsubscribe_channel':
          const chId = message.payload?.channelId;
          if (!chId) {
            log(`Unsubscribe channel message missing channelId from userId=${ws.userId}`, 'warn');
            return;
          }
          if (!ws.userId) {
            log('Unsubscribe channel message received from unauthenticated client', 'warn');
            return;
          }
          ws.channelIds?.delete(chId);
          this.channelClients.get(chId)?.delete(ws);
          log(`User ${ws.userId} unsubscribed from channel ${chId}`);
          break;

        // Call signaling
        case 'call:initiate':
          this.handleCallInitiate(ws, message.payload);
          break;
        case 'call:answer':
          this.handleCallAnswer(ws, message.payload);
          break;
        case 'call:ice-candidate':
          this.handleCallIceCandidate(ws, message.payload);
          break;
        case 'call:end':
          this.handleCallEnd(ws, message.payload);
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

  broadcastToChannel(channelId: string, message: WSMessage, excludeUserId?: string) {
    try {
      const clients = this.channelClients.get(channelId);
      if (!clients || clients.size === 0) {
        log(`No clients subscribed to channel ${channelId}`, 'info');
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
      log(`Broadcasted ${message.type} to ${sentCount} client(s) in channel ${channelId}`);
    } catch (error) {
      log(`Error broadcasting message to channel: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  broadcastPresenceUpdate(userId: string, presence: any) {
    // Broadcast to all connected clients (could be filtered by workspace in future)
    const message: WSMessage = {
      type: 'presence:updated',
      payload: presence,
    };

    let sentCount = 0;
    this.userClients.forEach((clients, clientUserId) => {
      if (clientUserId !== userId) { // Don't send to self
        clients.forEach(client => {
          try {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(message));
              sentCount++;
            }
          } catch (error) {
            log(`Error sending presence update to client ${clientUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          }
        });
      }
    });

    log(`Broadcasted presence update for user ${userId} to ${sentCount} client(s)`);
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

  // Call signaling handlers
  private handleCallInitiate(ws: AuthenticatedWebSocket, payload: any) {
    try {
      const { callId, callerId, calleeId, callType, offer, channelId, isGroupCall } = payload;

      if (!callId || !callerId || !calleeId || !offer) {
        log('Invalid call:initiate payload', 'warn');
        return;
      }

      // Validate that the caller is authenticated
      if (ws.userId !== callerId) {
        log(`Call initiate: caller ${callerId} doesn't match authenticated user ${ws.userId}`, 'warn');
        return;
      }

      log(`Call initiated: ${callerId} -> ${calleeId}, callId: ${callId}, groupCall: ${isGroupCall}`);

      // For group calls, calleeId might be an array of user IDs
      const calleeIds = Array.isArray(calleeId) ? calleeId : [calleeId];

      // Send incoming call notification to all callees
      calleeIds.forEach(targetUserId => {
        if (targetUserId !== callerId) { // Don't send to self
          this.broadcastToUser(targetUserId, {
            type: 'call:incoming',
            payload: {
              callId,
              callerId,
              calleeId: targetUserId, // Send individual callee ID for response
              callType,
              offer,
              channelId,
              isGroupCall,
              caller: { id: callerId, name: 'Caller', email: 'caller@example.com' }, // You'd fetch real user data here
            },
          });
        }
      });

    } catch (error) {
      log(`Error handling call initiate: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  private handleCallAnswer(ws: AuthenticatedWebSocket, payload: any) {
    try {
      const { callId, answer, targetUserId } = payload;

      if (!callId || !answer || !targetUserId) {
        log('Invalid call:answer payload', 'warn');
        return;
      }

      log(`Call answered: callId ${callId}, answerer: ${ws.userId}, target: ${targetUserId}`);

      // Send answer to the caller
      this.broadcastToUser(targetUserId, {
        type: 'call:answer',
        payload: {
          callId,
          answer,
        },
      });

    } catch (error) {
      log(`Error handling call answer: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  private handleCallIceCandidate(ws: AuthenticatedWebSocket, payload: any) {
    try {
      const { callId, candidate, targetUserId } = payload;

      if (!callId || !candidate || !targetUserId) {
        log('Invalid call:ice-candidate payload', 'warn');
        return;
      }

      log(`ICE candidate: callId ${callId}, from ${ws.userId} to ${targetUserId}`);

      // Forward ICE candidate to target user
      this.broadcastToUser(targetUserId, {
        type: 'call:ice-candidate',
        payload: {
          callId,
          candidate,
        },
      });

    } catch (error) {
      log(`Error handling ICE candidate: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  private handleCallEnd(ws: AuthenticatedWebSocket, payload: any) {
    try {
      const { callId, targetUserId } = payload;

      if (!callId || !targetUserId) {
        log('Invalid call:end payload', 'warn');
        return;
      }

      log(`Call ended: callId ${callId}, by ${ws.userId}, notifying ${targetUserId}`);

      // Notify the other party that the call has ended
      this.broadcastToUser(targetUserId, {
        type: 'call:end',
        payload: {
          callId,
        },
      });

    } catch (error) {
      log(`Error handling call end: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }
}

export const wsManager = new WebSocketManager();
