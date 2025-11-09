import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Use JWT_SECRET with fallback to SESSION_SECRET for backwards compatibility
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

function log(message: string, level: 'info' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [AUTH]`;
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

export function generateTokens(userId: string) {
  try {
    if (!userId) {
      throw new Error('UserId is required to generate tokens');
    }

    log(`Generating tokens for user: ${userId}`);
    
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
    
    log(`Tokens generated successfully for user: ${userId}`);
    return { accessToken, refreshToken };
  } catch (error) {
    log(`Error generating tokens for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    throw error;
  }
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    log('Authentication failed: No token provided', 'warn');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    log('Verifying token...');
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    if (!decoded.userId) {
      log('Authentication failed: Token missing userId', 'warn');
      return res.status(403).json({ message: 'Invalid token format' });
    }

    req.userId = decoded.userId;
    log(`Token verified for user: ${decoded.userId}`);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      log(`Authentication failed: User not found for userId: ${decoded.userId}`, 'warn');
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    log(`User authenticated successfully: ${user.email}`);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      log('Authentication failed: Token expired', 'warn');
      return res.status(403).json({ message: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      log(`Authentication failed: Invalid token - ${error.message}`, 'warn');
      return res.status(403).json({ message: 'Invalid token' });
    } else {
      log(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return res.status(500).json({ message: 'Authentication error' });
    }
  }
}
