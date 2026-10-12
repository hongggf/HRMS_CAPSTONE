import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { prisma } from '../config/db';

interface AuthenticatedSocket extends WebSocket {
  isAlive: boolean;
  userId?: number;
  email?: string;
  roles?: string[];
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<AuthenticatedSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  public init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', async (ws: AuthenticatedSocket, req) => {
      ws.isAlive = true;

      // Parse token from query parameters: /ws?token=...
      try {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');

        if (!token) {
          logger.warn('WebSocket connection rejected: Missing auth token');
          ws.close(4001, 'Unauthorized: Missing token');
          return;
        }

        let decoded: jwt.JwtPayload | string;
        try {
          decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
        } catch {
          logger.warn('WebSocket connection rejected: Invalid or expired token');
          ws.close(4001, 'Unauthorized: Invalid token');
          return;
        }

        if (!decoded || typeof decoded === 'string' || typeof decoded.id !== 'number') {
          ws.close(4001, 'Unauthorized: Malformed token');
          return;
        }

        // Fetch user from DB to verify active status and roles
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          include: {
            roles: {
              include: { role: true },
            },
          },
        });

        if (!user || !user.isActive) {
          ws.close(4001, 'Unauthorized: User inactive or not found');
          return;
        }

        ws.userId = user.id;
        ws.email = user.email;
        ws.roles = user.roles.map((r) => r.role.name);

        this.clients.add(ws);
        logger.info(`WebSocket client connected: User #${ws.userId} (${ws.email})`);

        // Send connection acknowledgment
        ws.send(
          JSON.stringify({
            type: 'CONNECTED',
            data: {
              userId: ws.userId,
              roles: ws.roles,
              message: 'Real-time WebSocket connection established',
            },
          }),
        );
      } catch (err) {
        logger.error('Error during WebSocket authentication handshake:', err);
        ws.close(4000, 'Internal Server Error');
        return;
      }

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        if (ws.userId) {
          logger.info(`WebSocket client disconnected: User #${ws.userId}`);
        }
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for User #${ws.userId}:`, error);
      });
    });

    // Heartbeat every 30 seconds to clean up dead sockets
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          this.clients.delete(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    logger.info('Real-time WebSocket server initialized on path /ws');
  }

  /**
   * Broadcast an event to all connected authenticated clients
   */
  public broadcast(type: string, data: unknown): void {
    const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Send an event to a specific user by their database ID
   */
  public sendToUser(userId: number, type: string, data: unknown): void {
    const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    this.clients.forEach((client) => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Broadcast to users with specific roles (e.g. HEAD_OF_HR)
   */
  public broadcastToRoles(roles: string[], type: string, data: unknown): void {
    const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    this.clients.forEach((client) => {
      if (
        client.roles &&
        client.roles.some((r) => roles.includes(r)) &&
        client.readyState === WebSocket.OPEN
      ) {
        client.send(payload);
      }
    });
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const wsManager = new WebSocketManager();
