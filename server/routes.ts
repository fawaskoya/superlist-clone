import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { prisma } from './database.js';
import bcrypt from 'bcryptjs';
import { authenticateToken, generateTokens, type AuthRequest } from './middleware/auth';
import { summarizeTask, generateSubtasks, prioritizeTasks } from './services/ai';
import { wsManager } from './websocket';
import { logTaskCreated, logTaskStatusChanged, logTaskPriorityChanged, logTaskAssigned, logTaskUnassigned, logTaskMoved, logCommentAdded } from './activityLogger';
import { getUserWorkspacePermissions, updateMemberPermissions, ROLE_PERMISSIONS } from './permissions';
import OpenAI from 'openai';
import { RRule, RRuleSet } from 'rrule';
import { supabaseStorage } from './supabase';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  insertUserSchema,
  loginSchema,
  insertWorkspaceSchema,
  insertListSchema,
  insertTaskSchema,
  updateTaskSchema,
  insertCommentSchema,
  aiSummarizeSchema,
  aiGenerateSubtasksSchema,
  aiPrioritizeTasksSchema,
} from '../shared/schema';

// Enhanced logging function for routes
function routeLog(message: string, level: 'info' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [ROUTES]`;
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

// Helper function to get or create organization based on email domain
async function getOrCreateOrganization(email: string): Promise<string | null> {
  try {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    // Try to find existing organization
    let organization = await prisma.organization.findUnique({
      where: { domain },
    });

    if (!organization) {
      // Create new organization
      organization = await prisma.organization.create({
        data: {
          domain,
          name: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Organization`,
        },
      });
      routeLog(`Created organization: ${organization.name} (${domain})`);
    }

    return organization.id;
  } catch (error) {
    routeLog(`Failed to get/create organization for domain ${email.split('@')[1]}: ${error}`, 'error');
    return null;
  }
}

// Admin middleware - checks if user is an admin
async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    routeLog(`Admin check failed for user ${req.user?.id}: ${error}`, 'error');
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Helper function to handle Prisma errors
function handlePrismaError(error: any, operation: string): Error {
  if (error.code === 'P2002') {
    routeLog(`${operation} failed: Unique constraint violation`, 'warn');
    return new Error('A record with this value already exists');
  } else if (error.code === 'P2025') {
    routeLog(`${operation} failed: Record not found`, 'warn');
    return new Error('Record not found');
  } else if (error.code === 'P2003') {
    routeLog(`${operation} failed: Foreign key constraint violation`, 'warn');
    return new Error('Invalid reference to related record');
  } else {
    routeLog(`${operation} failed: ${error.message}`, 'error');
    return error;
  }
}

// Helper function to verify user has access to a workspace
async function verifyWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: { userId },
          },
        },
      ],
    },
  });
  return !!workspace;
}

export async function registerRoutes(app: Express): Promise<Server> {
  try {
    routeLog('Registering routes...');

    // Test Prisma connection
    await prisma.$connect();
    routeLog('Prisma connection verified');

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: 'connected'
      });
    });

  // Auth Routes
  app.post('/api/auth/register', async (req, res, next) => {
    try {
      routeLog('Registration attempt');
      const data = insertUserSchema.parse(req.body);
      
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        routeLog(`Registration failed: User already exists - ${data.email}`, 'warn');
        return res.status(400).json({ message: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      // Get or create organization based on email domain
      const organizationId = await getOrCreateOrganization(data.email);

      const user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          organizationId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      routeLog(`User created: ${user.email} (${user.id})`);

      // ALWAYS create a default workspace for new users
      // They can still accept invitations to join other workspaces
      // Generate unique slug using user ID to avoid collisions
      const uniqueSlug = `my-workspace-${user.id.slice(0, 8)}`;
      
      try {
        const workspace = await prisma.workspace.create({
          data: {
            name: 'My Workspace',
            slug: uniqueSlug,
            ownerId: user.id,
          },
        });

        routeLog(`Workspace created: ${workspace.id} for user ${user.id}`);

        // Add user as workspace member with OWNER role
        await prisma.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: 'OWNER',
          },
        });

        const inboxList = await prisma.list.create({
          data: {
            name: 'Inbox',
            description: 'Your default task list',
            workspaceId: workspace.id,
            createdById: user.id,
            isPersonal: false,
          },
        });

        await prisma.task.createMany({
          data: [
            {
              title: 'Welcome to TaskFlow!',
              description: 'This is your first task. Try creating more tasks, adding subtasks, and using AI features.',
              listId: inboxList.id,
              workspaceId: workspace.id,
              createdById: user.id,
              status: 'TODO',
              priority: 'MEDIUM',
              orderIndex: 0,
            },
            {
              title: 'Try the AI features',
              description: 'Click on any task to open the details drawer, then use the AI buttons to summarize, generate subtasks, or get priority suggestions.',
              listId: inboxList.id,
              workspaceId: workspace.id,
              createdById: user.id,
              status: 'TODO',
              priority: 'HIGH',
              orderIndex: 1,
            },
          ],
        });

        routeLog(`Default workspace and tasks created for user ${user.id}`);
      } catch (workspaceError) {
        routeLog(`Error creating workspace for user ${user.id}: ${workspaceError instanceof Error ? workspaceError.message : 'Unknown error'}`, 'error');
        // Continue even if workspace creation fails - user is still created
      }

      const tokens = generateTokens(user.id);

      routeLog(`Registration successful for user: ${user.email}`);
      res.status(201).json({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        routeLog(`Registration failed: Validation error - ${error.errors.map((e: any) => e.message).join(', ')}`, 'warn');
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      const prismaError = handlePrismaError(error, 'User registration');
      next(prismaError);
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          organizationId: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user });
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      routeLog(`Login attempt for email: ${req.body?.email || 'unknown'}`);
      const data = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        routeLog(`Login failed: User not found - ${data.email}`, 'warn');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

      if (!isValidPassword) {
        routeLog(`Login failed: Invalid password for user - ${data.email}`, 'warn');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const tokens = generateTokens(user.id);
      routeLog(`Login successful for user: ${user.email}`);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        routeLog(`Login failed: Validation error - ${error.errors.map((e: any) => e.message).join(', ')}`, 'warn');
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      routeLog(`Login error: ${error.message}`, 'error');
      next(error);
    }
  });

  // Workspace Routes
  app.get('/api/workspaces', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const workspaces = await prisma.workspace.findMany({
        where: {
          OR: [
            { ownerId: req.userId },
            {
              members: {
                some: { userId: req.userId },
              },
            },
          ],
        },
        include: {
          members: {
            where: { userId: req.userId },
            select: { role: true, permissions: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Attach user's role to each workspace
      const workspacesWithRole = workspaces.map(workspace => ({
        ...workspace,
        userRole: workspace.members[0]?.role || (workspace.ownerId === req.userId ? 'OWNER' : null),
        userPermissions: workspace.members[0]?.permissions,
        members: undefined, // Remove members array from response
      }));

      res.json(workspacesWithRole);
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/workspaces', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const data = insertWorkspaceSchema.parse(req.body);

      const workspace = await prisma.workspace.create({
        data: {
          name: data.name,
          slug: data.slug,
          ownerId: req.userId!,
        },
      });

      // Add creator as workspace member with OWNER role
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: req.userId!,
          role: 'OWNER',
        },
      });

      await prisma.list.create({
        data: {
          name: 'Inbox',
          description: 'Default task list',
          workspaceId: workspace.id,
          createdById: req.userId!,
        },
      });

      res.status(201).json(workspace);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/workspaces/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: req.params.id,
          OR: [
            { ownerId: req.userId },
            {
              members: {
                some: { userId: req.userId },
              },
            },
          ],
        },
      });

      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      res.json(workspace);
    } catch (error: any) {
      next(error);
    }
  });

  // Workspace Member & Permission Routes
  app.get('/api/workspaces/:id/members', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access FIRST before any operations
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      // Auto-fix: Check if workspace owner is missing as a member
      const workspace = await prisma.workspace.findUnique({
        where: { id: req.params.id },
        select: { ownerId: true },
      });

      if (workspace) {
        const ownerMember = await prisma.workspaceMember.findFirst({
          where: {
            workspaceId: req.params.id,
            userId: workspace.ownerId,
          },
        });

        // If owner is not a member, add them automatically
        if (!ownerMember) {
          await prisma.workspaceMember.create({
            data: {
              workspaceId: req.params.id,
              userId: workspace.ownerId,
              role: 'OWNER',
            },
          });
        }
      }

      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: req.params.id },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      const membersWithPermissions = await Promise.all(
        members.map(async (member) => {
          const permissions = await getUserWorkspacePermissions(member.userId, req.params.id);
          return {
            ...member,
            effectivePermissions: permissions,
            defaultPermissions: ROLE_PERMISSIONS[member.role],
          };
        })
      );

      res.json(membersWithPermissions);
    } catch (error: any) {
      next(error);
    }
  });

  app.patch('/api/workspaces/:workspaceId/members/:userId', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { permissions, role } = req.body;

      // Check if requester has MANAGE_MEMBERS permission
      const hasPermission = await getUserWorkspacePermissions(req.userId!, req.params.workspaceId);
      if (!hasPermission.includes('MANAGE_MEMBERS' as any)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Get requester's member record to check their role
      const requesterMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: req.params.workspaceId,
            userId: req.userId!,
          },
        },
      });

      if (!requesterMember) {
        return res.status(403).json({ message: 'You are not a member of this workspace' });
      }

      // Get current member to check their role
      const currentMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: req.params.workspaceId,
            userId: req.params.userId,
          },
        },
      });

      if (!currentMember) {
        return res.status(404).json({ message: 'Member not found' });
      }

      // Only OWNERS can grant or revoke OWNER role
      if (role && (role === 'OWNER' || currentMember.role === 'OWNER')) {
        if (requesterMember.role !== 'OWNER') {
          return res.status(403).json({ 
            message: 'Only workspace owners can grant or revoke owner role' 
          });
        }
      }

      // If changing role from OWNER, ensure there's at least one other OWNER
      if (role && currentMember.role === 'OWNER' && role !== 'OWNER') {
        const ownerCount = await prisma.workspaceMember.count({
          where: {
            workspaceId: req.params.workspaceId,
            role: 'OWNER',
          },
        });

        if (ownerCount <= 1) {
          return res.status(403).json({ 
            message: 'Cannot demote the sole owner. Assign another owner first.' 
          });
        }
      }

      // Prevent self-demotion if you're the sole owner
      if (role && req.userId === req.params.userId && currentMember.role === 'OWNER' && role !== 'OWNER') {
        const ownerCount = await prisma.workspaceMember.count({
          where: {
            workspaceId: req.params.workspaceId,
            role: 'OWNER',
          },
        });

        if (ownerCount <= 1) {
          return res.status(403).json({ 
            message: 'Cannot demote yourself as the sole owner. Assign another owner first.' 
          });
        }
      }

      const updateData: any = {};
      if (role) updateData.role = role;
      if (permissions) updateData.permissions = JSON.stringify(permissions);

      const member = await prisma.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId: req.params.workspaceId,
            userId: req.params.userId,
          },
        },
        data: updateData,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.json(member);
    } catch (error: any) {
      next(error);
    }
  });

  app.delete('/api/workspaces/:workspaceId/members/:userId', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Check if requester has MANAGE_MEMBERS permission
      const permissions = await getUserWorkspacePermissions(req.userId!, req.params.workspaceId);
      if (!permissions.includes('MANAGE_MEMBERS' as any)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Cannot remove workspace owner
      const memberToRemove = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: req.params.workspaceId,
            userId: req.params.userId,
          },
        },
      });

      if (memberToRemove?.role === 'OWNER') {
        return res.status(403).json({ message: 'Cannot remove workspace owner' });
      }

      await prisma.workspaceMember.delete({
        where: {
          workspaceId_userId: {
            workspaceId: req.params.workspaceId,
            userId: req.params.userId,
          },
        },
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error: any) {
      next(error);
    }
  });

  // Old invitation endpoint removed - replaced with proper WorkspaceInvitation system below

  app.patch('/api/workspaces/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { name } = req.body;

      // Check if requester has MANAGE_WORKSPACE permission
      const permissions = await getUserWorkspacePermissions(req.userId!, req.params.id);
      if (!permissions.includes('MANAGE_WORKSPACE' as any)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const workspace = await prisma.workspace.update({
        where: { id: req.params.id },
        data: { name },
      });

      res.json(workspace);
    } catch (error: any) {
      next(error);
    }
  });

  app.delete('/api/workspaces/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Check if requester has MANAGE_WORKSPACE permission
      const permissions = await getUserWorkspacePermissions(req.userId!, req.params.id);
      if (!permissions.includes('MANAGE_WORKSPACE' as any)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Delete workspace (this will cascade delete all related data)
      await prisma.workspace.delete({
        where: { id: req.params.id },
      });

      res.json({ message: 'Workspace deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  });

  // List Routes
  app.get('/api/workspaces/:workspaceId/lists', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const lists = await prisma.list.findMany({
        where: { workspaceId: req.params.workspaceId },
        orderBy: { createdAt: 'asc' },
      });

      res.json(lists);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/lists/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const list = await prisma.list.findUnique({
        where: { id: req.params.id },
      });

      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, list.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      res.json(list);
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/workspaces/:workspaceId/lists', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const data = insertListSchema.parse(req.body);

      const list = await prisma.list.create({
        data: {
          name: data.name,
          description: data.description,
          isPersonal: data.isPersonal || false,
          workspaceId: req.params.workspaceId,
          createdById: req.userId!,
        },
      });

      res.status(201).json(list);
    } catch (error: any) {
      next(error);
    }
  });

  // Quick View Routes
  app.get('/api/workspaces/:workspaceId/tasks/today', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tasks = await prisma.task.findMany({
        where: {
          workspaceId: req.params.workspaceId,
          dueDate: {
            gte: today,
            lt: tomorrow,
          },
          parentId: null,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          list: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      res.json(tasks);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/workspaces/:workspaceId/tasks/upcoming', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const tasks = await prisma.task.findMany({
        where: {
          workspaceId: req.params.workspaceId,
          dueDate: {
            gte: tomorrow,
          },
          parentId: null,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          list: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      res.json(tasks);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/workspaces/:workspaceId/tasks/assigned', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const tasks = await prisma.task.findMany({
        where: {
          workspaceId: req.params.workspaceId,
          assignedToId: req.userId,
          parentId: null,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          list: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      res.json(tasks);
    } catch (error: any) {
      next(error);
    }
  });

  // Get inbox tasks (tasks without a list)
  app.get('/api/workspaces/:workspaceId/tasks/inbox', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const tasks = await prisma.task.findMany({
        where: {
          workspaceId: req.params.workspaceId,
          listId: null,
          parentId: null,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      });

      res.json(tasks);
    } catch (error: any) {
      next(error);
    }
  });

  // Get all tasks in workspace (for global Tasks view)
  app.get('/api/workspaces/:workspaceId/tasks/all', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const { status, listId, priority } = req.query;
      
      const where: any = {
        workspaceId: req.params.workspaceId,
        parentId: null,
      };

      if (status) {
        where.status = status;
      }

      if (listId !== undefined) {
        where.listId = listId === 'null' ? null : listId;
      }

      if (priority) {
        where.priority = priority;
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          list: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
      });

      res.json(tasks);
    } catch (error: any) {
      next(error);
    }
  });

  // Get tasks for calendar view (with date range filtering)
  app.get('/api/workspaces/:workspaceId/tasks/calendar', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }

      const tasks = await prisma.task.findMany({
        where: {
          workspaceId: req.params.workspaceId,
          parentId: null,
          dueDate: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        },
        include: {
          list: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
      });

      res.json(tasks);
    } catch (error: any) {
      next(error);
    }
  });

  // Get events for calendar view (with date range filtering)
  app.get('/api/workspaces/:workspaceId/events', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const { startDate, endDate } = req.query;

      const where: any = {
        workspaceId: req.params.workspaceId,
      };

      if (startDate && endDate) {
        where.startTime = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      const events = await prisma.event.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { startTime: 'asc' },
          { createdAt: 'desc' },
        ],
      });

      res.json(events);
    } catch (error: any) {
      next(error);
    }
  });

  // Create event
  app.post('/api/workspaces/:workspaceId/events', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const { title, description, type, startTime, endTime, allDay, location, attendees } = req.body;

      const event = await prisma.event.create({
        data: {
          title,
          description,
          type: type || 'EVENT',
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          allDay: allDay || false,
          location,
          attendees: JSON.stringify(attendees || []),
          workspaceId: req.params.workspaceId,
          createdById: req.userId!,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json(event);
    } catch (error: any) {
      next(error);
    }
  });

  // Update event
  app.put('/api/events/:eventId', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { title, description, type, startTime, endTime, allDay, location, attendees } = req.body;

      // Find event and verify access
      const event = await prisma.event.findUnique({
        where: { id: req.params.eventId },
        include: { workspace: true },
      });

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      // Check if user can update (creator or workspace owner)
      if (event.createdById !== req.userId! && event.workspace.ownerId !== req.userId!) {
        return res.status(403).json({ message: 'Access denied to update this event' });
      }

      const updatedEvent = await prisma.event.update({
        where: { id: req.params.eventId },
        data: {
          title,
          description,
          type,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          allDay,
          location,
          attendees: JSON.stringify(attendees || []),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json(updatedEvent);
    } catch (error: any) {
      next(error);
    }
  });

  // Delete event
  app.delete('/api/events/:eventId', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Find event and verify access
      const event = await prisma.event.findUnique({
        where: { id: req.params.eventId },
        include: { workspace: true },
      });

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      // Check if user can delete (creator or workspace owner)
      if (event.createdById !== req.userId! && event.workspace.ownerId !== req.userId!) {
        return res.status(403).json({ message: 'Access denied to delete this event' });
      }

      await prisma.event.delete({
        where: { id: req.params.eventId },
      });

      res.json({ message: 'Event deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  });

  // Create inbox task (no list assignment)
  app.post('/api/workspaces/:workspaceId/tasks', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const data = insertTaskSchema.parse(req.body);

      const maxOrder = await prisma.task.findFirst({
        where: { 
          workspaceId: req.params.workspaceId,
          listId: null,
          parentId: data.parentId || null 
        },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });

      const task = await prisma.task.create({
        data: {
          title: data.title,
          description: data.description,
          status: data.status || 'TODO',
          priority: data.priority || 'MEDIUM',
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          assignedToId: data.assignedToId,
          parentId: data.parentId,
          listId: null,
          workspaceId: req.params.workspaceId,
          createdById: req.userId!,
          orderIndex: (maxOrder?.orderIndex || 0) + 1,
          isRecurring: data.isRecurring || false,
          recurrenceRule: data.recurrenceRule,
          recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Generate recurring task instances if this is a recurring task
      // Pre-generation disabled in favor of on-completion generation
      /*
      if (data.isRecurring && data.recurrenceRule) {
        await generateRecurringTaskInstances(
          task,
          data.recurrenceRule,
          data.recurrenceEnd ? new Date(data.recurrenceEnd) : undefined
        );
      }
      */

      // Log activity
      await logTaskCreated(task.id, req.userId!);

      // If assigned to someone, log that too
      if (task.assignedToId && task.assignedTo) {
        await logTaskAssigned(task.id, req.userId!, task.assignedToId, task.assignedTo.name);
      }

      // Broadcast to workspace
      wsManager.broadcastTaskCreated(req.params.workspaceId, task, req.userId);

      res.status(201).json(task);
    } catch (error: any) {
      next(error);
    }
  });

// Helper function to generate recurring task instances
async function generateRecurringTaskInstances(
  originalTask: any,
  recurrenceRule: string,
  recurrenceEnd?: Date
) {
  try {
    const { rrulestr } = await import('rrule');
    const rule = rrulestr(recurrenceRule);
    const instances = rule.all();

    // Limit to next 10 instances for performance
    const futureInstances = instances
      .filter(date => date > new Date())
      .slice(0, 10)
      .filter(date => !recurrenceEnd || date <= recurrenceEnd);

    const createdTasks = [];

    for (const instanceDate of futureInstances) {
      const task = await prisma.task.create({
        data: {
          title: originalTask.title,
          description: originalTask.description,
          status: 'TODO',
          priority: originalTask.priority,
          dueDate: instanceDate,
          assignedToId: originalTask.assignedToId,
          listId: originalTask.listId,
          workspaceId: originalTask.workspaceId,
          createdById: originalTask.createdById,
          originalTaskId: originalTask.id,
          orderIndex: originalTask.orderIndex,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      createdTasks.push(task);
    }

    return createdTasks;
  } catch (error) {
    console.error('Error generating recurring task instances:', error);
    return [];
  }
}

  app.get('/api/workspaces/:workspaceId/search', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { q, status, priority, assignedTo } = req.query;
      
      const where: any = {
        list: {
          workspaceId: req.params.workspaceId,
        },
        parentId: null,
      };

      if (q) {
        where.OR = [
          { title: { contains: q as string, mode: 'insensitive' } },
          { description: { contains: q as string, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (priority) {
        where.priority = priority;
      }

      if (assignedTo) {
        where.assignedToId = assignedTo;
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          list: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json(tasks);
    } catch (error: any) {
      next(error);
    }
  });

  // Task Routes
  app.get('/api/lists/:listId/tasks', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Get list to verify workspace access
      const list = await prisma.list.findUnique({
        where: { id: req.params.listId },
        select: { workspaceId: true },
      });

      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, list.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const tasks = await prisma.task.findMany({
        where: {
          listId: req.params.listId,
          parentId: null,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      });

      res.json(tasks);
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/lists/:listId/tasks', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const data = insertTaskSchema.parse(req.body);

      // Get the list to retrieve workspaceId and verify access
      const list = await prisma.list.findUnique({
        where: { id: req.params.listId },
        select: { workspaceId: true },
      });

      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, list.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const maxOrder = await prisma.task.findFirst({
        where: { listId: req.params.listId, parentId: data.parentId || null },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });

      const task = await prisma.task.create({
        data: {
          title: data.title,
          description: data.description,
          status: data.status || 'TODO',
          priority: data.priority || 'MEDIUM',
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          assignedToId: data.assignedToId,
          parentId: data.parentId,
          listId: req.params.listId,
          workspaceId: list.workspaceId,
          createdById: req.userId!,
          orderIndex: (maxOrder?.orderIndex || 0) + 1,
          isRecurring: data.isRecurring || false,
          recurrenceRule: data.recurrenceRule,
          recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          list: {
            select: {
              id: true,
              name: true,
              workspaceId: true,
            },
          },
        },
      });

      // Generate recurring task instances if this is a recurring task
      // Pre-generation disabled in favor of on-completion generation
      /*
      if (data.isRecurring && data.recurrenceRule) {
        await generateRecurringTaskInstances(
          task,
          data.recurrenceRule,
          data.recurrenceEnd ? new Date(data.recurrenceEnd) : undefined
        );
      }
      */

      // Log activity
      await logTaskCreated(task.id, req.userId!);

      // If assigned to someone, log that too
      if (task.assignedToId && task.assignedTo) {
        await logTaskAssigned(task.id, req.userId!, task.assignedToId, task.assignedTo.name);
      }

      // Broadcast to workspace
      if (task.list) {
        wsManager.broadcastTaskCreated(task.list.workspaceId, task, req.userId);
      }

      res.status(201).json(task);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/tasks/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.id },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      res.json(task);
    } catch (error: any) {
      next(error);
    }
  });

  app.patch('/api/tasks/:id/reorder', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { orderIndex, listId } = req.body;
      const taskId = req.params.id;

      const currentTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          list: {
            select: {
              workspaceId: true,
            },
          },
        },
      });

      if (!currentTask) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const targetListId = listId || currentTask.listId;
      const workspaceId = currentTask.list?.workspaceId || currentTask.workspaceId;

      // Get all tasks in the target list
      const tasksInList = await prisma.task.findMany({
        where: {
          listId: targetListId,
          parentId: null,
          id: { not: taskId },
        },
        orderBy: { orderIndex: 'asc' },
      });

      // Calculate new order indices
      const updates: { id: string; orderIndex: number; listId?: string }[] = [];
      
      // Insert task at new position
      let currentIndex = 0;
      for (let i = 0; i <= tasksInList.length; i++) {
        if (i === orderIndex) {
          updates.push({
            id: taskId,
            orderIndex: currentIndex++,
            ...(listId ? { listId } : {}),
          });
        }
        if (i < tasksInList.length) {
          updates.push({
            id: tasksInList[i].id,
            orderIndex: currentIndex++,
          });
        }
      }

      // Update all tasks in a transaction
      await prisma.$transaction(
        updates.map((update) =>
          prisma.task.update({
            where: { id: update.id },
            data: {
              orderIndex: update.orderIndex,
              ...(update.listId ? { listId: update.listId } : {}),
            },
          })
        )
      );

      const updatedTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          list: {
            select: {
              id: true,
              name: true,
              workspaceId: true,
            },
          },
        },
      });

      // Broadcast to workspace
      wsManager.broadcastTaskUpdated(workspaceId, updatedTask!, req.userId);

      res.json(updatedTask);
    } catch (error: any) {
      next(error);
    }
  });

  app.patch('/api/tasks/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const data = updateTaskSchema.parse(req.body);

      // Get the current task to check for changes
      const currentTask = await prisma.task.findUnique({
        where: { id: req.params.id },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!currentTask) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const task = await prisma.task.update({
        where: { id: req.params.id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.status && { status: data.status }),
          ...(data.priority && { priority: data.priority }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
          ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
          ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
          ...(data.recurrenceRule !== undefined && { recurrenceRule: data.recurrenceRule }),
          ...(data.recurrenceEnd !== undefined && { recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null }),
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          orderIndex: true,
          listId: true,
          workspaceId: true,
          assignedToId: true,
          createdById: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          isRecurring: true,
          recurrenceRule: true,
          recurrenceEnd: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          list: {
            select: {
              id: true,
              name: true,
              workspaceId: true,
            },
          },
        },
      });

      // Handle Recurring Task Completion
      if (data.status === 'DONE' && task.isRecurring && task.recurrenceRule) {
        try {
          const { rrulestr } = await import('rrule');
          const rule = rrulestr(task.recurrenceRule);
          const nextDate = rule.after(new Date(), true); // Get next occurrence after now

          if (nextDate && (!task.recurrenceEnd || nextDate <= task.recurrenceEnd)) {
             const nextTask = await prisma.task.create({
               data: {
                 title: task.title,
                 description: task.description,
                 status: 'TODO',
                 priority: task.priority,
                 dueDate: nextDate,
                 assignedToId: task.assignedToId,
                 listId: task.listId,
                 workspaceId: task.workspaceId,
                 createdById: task.createdById,
                 originalTaskId: task.id, // Link to previous task
                 orderIndex: task.orderIndex,
                 isRecurring: true,
                 recurrenceRule: task.recurrenceRule,
                 recurrenceEnd: task.recurrenceEnd,
               }
             });
             
             // Notify workspace of new task
             wsManager.broadcastTaskCreated(task.workspaceId, nextTask, req.userId);
          }
        } catch (err) {
           serverLog(`Failed to generate next recurring task: ${err}`, 'error');
        }
      }

      // Log status changes
      if (data.status && data.status !== currentTask.status) {
        await logTaskStatusChanged(task.id, req.userId!, currentTask.status, data.status);
      }

      // Log priority changes
      if (data.priority && data.priority !== currentTask.priority) {
        await logTaskPriorityChanged(task.id, req.userId!, currentTask.priority, data.priority);
      }

      // Log assignment changes
      if (data.assignedToId !== undefined && data.assignedToId !== currentTask.assignedToId) {
        if (data.assignedToId === null && currentTask.assignedTo) {
          // Unassigned
          await logTaskUnassigned(task.id, req.userId!, currentTask.assignedToId!, currentTask.assignedTo.name);
        } else if (data.assignedToId && task.assignedTo) {
          // Assigned to someone
          await logTaskAssigned(task.id, req.userId!, data.assignedToId, task.assignedTo.name);
        }
      }

      // Create notification if task was assigned to someone new
      if (
        data.assignedToId !== undefined &&
        data.assignedToId !== currentTask?.assignedToId &&
        data.assignedToId !== null &&
        data.assignedToId !== req.userId
      ) {
        const notification = await prisma.notification.create({
          data: {
            userId: data.assignedToId,
            type: 'TASK_ASSIGNED',
            data: JSON.stringify({
              taskId: task.id,
              taskTitle: task.title,
              assignedBy: req.userId,
            }),
          },
        });

        // Broadcast notification via WebSocket
        wsManager.broadcastToUser(data.assignedToId, {
          type: 'notification:created',
          payload: notification,
        });
      }

      // Broadcast to workspace
      wsManager.broadcastTaskUpdated(task.workspaceId, task, req.userId);

      res.json(task);
    } catch (error: any) {
      next(error);
    }
  });

  app.delete('/api/tasks/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          workspaceId: true,
        },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      await prisma.task.delete({
        where: { id: req.params.id },
      });

      // Broadcast to workspace
      wsManager.broadcastTaskDeleted(task.workspaceId, req.params.id, req.userId);

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  });

  // Subtasks
  app.get('/api/tasks/:id/subtasks', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const subtasks = await prisma.task.findMany({
        where: { parentId: req.params.id },
        orderBy: { orderIndex: 'asc' },
      });

      res.json(subtasks);
    } catch (error: any) {
      next(error);
    }
  });

  // Comments
  app.get('/api/tasks/:id/comments', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const comments = await prisma.taskComment.findMany({
        where: { taskId: req.params.id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json(comments);
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/tasks/:id/comments', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const data = insertCommentSchema.parse(req.body);

      const comment = await prisma.taskComment.create({
        data: {
          body: data.body,
          taskId: req.params.id,
          authorId: req.userId!,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Log comment activity
      await logCommentAdded(req.params.id, req.userId!, comment.id);

      res.status(201).json(comment);
    } catch (error: any) {
      next(error);
    }
  });

  // Activity Timeline
  app.get('/api/tasks/:id/activities', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const activities = await prisma.taskActivity.findMany({
        where: { taskId: req.params.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(activities);
    } catch (error: any) {
      next(error);
    }
  });

  // File Attachment Routes
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  });

  app.post('/api/tasks/:id/attachments', authenticateToken, upload.single('file'), async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Upload to Supabase
      const uploadResult = await supabaseStorage.uploadFile(
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        req.params.id,
        req.userId!
      );

      if (!uploadResult) {
        // Fallback to local storage if Supabase fails
        console.warn('Supabase upload failed, using local storage');
      }

      const attachment = await prisma.fileAttachment.create({
        data: {
          taskId: req.params.id,
          filename: uploadResult ? uploadResult.url : req.file.filename,
          originalName: req.file.originalname,
          filepath: uploadResult ? uploadResult.url : req.file.path,
          mimeType: req.file.mimetype,
          size: req.file.size,
          uploadedById: req.userId!,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Log file attachment activity
      await prisma.taskActivity.create({
        data: {
          taskId: req.params.id,
          userId: req.userId!,
          type: 'FILE_ATTACHED',
          metadata: JSON.stringify({
            filename: req.file.originalname,
            attachmentId: attachment.id,
            thumbnailUrl: uploadResult?.thumbnailUrl
          }),
        },
      });

      // Clean up local file if Supabase upload succeeded
      if (uploadResult) {
        fs.unlinkSync(req.file.path);
      }

      res.status(201).json({
        ...attachment,
        thumbnailUrl: uploadResult?.thumbnailUrl
      });
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/tasks/:id/attachments', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const attachments = await prisma.fileAttachment.findMany({
        where: { taskId: req.params.id },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(attachments);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/attachments/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const attachment = await prisma.fileAttachment.findUnique({
        where: { id: req.params.id },
      });

      if (!attachment) {
        return res.status(404).json({ message: 'Attachment not found' });
      }

      res.download(attachment.filepath, attachment.originalName);
    } catch (error: any) {
      next(error);
    }
  });

  app.delete('/api/attachments/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const attachment = await prisma.fileAttachment.findUnique({
        where: { id: req.params.id },
      });

      if (!attachment) {
        return res.status(404).json({ message: 'Attachment not found' });
      }

      // Delete file from filesystem
      if (fs.existsSync(attachment.filepath)) {
        fs.unlinkSync(attachment.filepath);
      }

      // Log file removal activity
      await prisma.taskActivity.create({
        data: {
          taskId: attachment.taskId,
          userId: req.userId!,
          type: 'FILE_REMOVED',
          metadata: JSON.stringify({ filename: attachment.originalName, attachmentId: attachment.id }),
        },
      });

      await prisma.fileAttachment.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  });

  // Voice notes endpoints
  const voiceNotesStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'voice-notes');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '.webm');
    }
  });

  const voiceNoteUpload = multer({
    storage: voiceNotesStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for voice notes
    fileFilter: (req, file, cb) => {
      // Accept audio files
      if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'));
      }
    }
  });

  app.post('/api/tasks/:id/voice-notes', authenticateToken, voiceNoteUpload.single('audio'), async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No audio file uploaded' });
      }

      // Upload audio to Supabase
      const uploadResult = await supabaseStorage.uploadFile(
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        req.params.id,
        req.userId!
      );

      if (!uploadResult) {
        console.warn('Supabase upload failed for voice note, using local storage');
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      let transcription = null;

      try {
        // Transcribe the audio file using Whisper
        const transcriptionResponse = await openai.audio.transcriptions.create({
          file: fs.createReadStream(req.file.path),
          model: 'whisper-1',
          language: 'en', // Can be made configurable later
        });
        transcription = transcriptionResponse.text;
      } catch (transcriptionError) {
        console.warn('Voice transcription failed:', transcriptionError);
        // Continue without transcription if Whisper fails
      }

      // Get audio duration (simple estimation based on file size for now)
      // In production, you'd use a proper audio library like ffmpeg
      const duration = Math.floor(req.file.size / 16000); // Rough estimation

      const voiceNote = await prisma.voiceNote.create({
        data: {
          taskId: req.params.id,
          audioPath: uploadResult ? uploadResult.url : req.file.path,
          transcription: transcription,
          duration: duration,
          uploadedById: req.userId!,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Log voice note activity
      await prisma.taskActivity.create({
        data: {
          taskId: req.params.id,
          userId: req.userId!,
          type: 'VOICE_NOTE_ADDED',
          metadata: JSON.stringify({
            voiceNoteId: voiceNote.id,
            duration: duration,
            hasTranscription: transcription !== null
          }),
        },
      });

      // Clean up local file if Supabase upload succeeded
      if (uploadResult) {
        fs.unlinkSync(req.file.path);
      }

      res.status(201).json(voiceNote);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/tasks/:id/voice-notes', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const voiceNotes = await prisma.voiceNote.findMany({
        where: { taskId: req.params.id },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(voiceNotes);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/voice-notes/:id/audio', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const voiceNote = await prisma.voiceNote.findUnique({
        where: { id: req.params.id },
      });

      if (!voiceNote) {
        return res.status(404).json({ message: 'Voice note not found' });
      }

      res.setHeader('Content-Type', 'audio/webm');
      res.download(voiceNote.audioPath, `voice-note-${voiceNote.id}.webm`);
    } catch (error: any) {
      next(error);
    }
  });

  app.delete('/api/voice-notes/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const voiceNote = await prisma.voiceNote.findUnique({
        where: { id: req.params.id },
      });

      if (!voiceNote) {
        return res.status(404).json({ message: 'Voice note not found' });
      }

      // Delete the audio file
      if (fs.existsSync(voiceNote.audioPath)) {
        fs.unlinkSync(voiceNote.audioPath);
      }

      // Log voice note removal activity
      await prisma.taskActivity.create({
        data: {
          taskId: voiceNote.taskId,
          userId: req.userId!,
          type: 'VOICE_NOTE_REMOVED',
          metadata: JSON.stringify({
            voiceNoteId: voiceNote.id,
            duration: voiceNote.duration
          }),
        },
      });

      await prisma.voiceNote.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  });

  // Recurring task endpoints
  app.post('/api/tasks/:id/skip-instance', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Get the task
      const task = await prisma.task.findUnique({
        where: { id: req.params.id },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, task.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      // Check if this is a recurring task instance
      if (!task.originalTaskId) {
        return res.status(400).json({ message: 'This is not a recurring task instance' });
      }

      // Mark this instance as completed/skipped
      await prisma.task.update({
        where: { id: req.params.id },
        data: { status: 'DONE' },
      });

      // Generate next instance if this was the current instance
      const originalTask = await prisma.task.findUnique({
        where: { id: task.originalTaskId },
      });

      if (originalTask && originalTask.recurrenceRule) {
        // Generate one new instance to replace the skipped one
        const newInstances = await generateRecurringTaskInstances(
          originalTask,
          originalTask.recurrenceRule,
          originalTask.recurrenceEnd || undefined
        );

        if (newInstances.length > 0) {
          // Broadcast the new task
          wsManager.broadcastTaskCreated(originalTask.workspaceId, newInstances[0], req.userId);
        }
      }

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  });

  // My Day endpoints
  app.post('/api/my-day/:taskId', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Check if task exists and user has access
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        select: { workspaceId: true },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, task.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this task' });
      }

      // Add task to My Day
      const myDayTask = await prisma.myDayTask.create({
        data: {
          userId: req.userId!,
          taskId: req.params.taskId,
        },
        include: {
          task: {
            include: {
              assignedTo: { select: { id: true, name: true, email: true } },
              list: { select: { id: true, name: true } },
            },
          },
        },
      });

      res.status(201).json(myDayTask);
    } catch (error: any) {
      // Handle unique constraint violation (task already in My Day)
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Task is already in My Day' });
      }
      next(error);
    }
  });

  app.delete('/api/my-day/:taskId', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Remove task from My Day
      await prisma.myDayTask.deleteMany({
        where: {
          userId: req.userId!,
          taskId: req.params.taskId,
        },
      });

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/my-day', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const myDayTasks = await prisma.myDayTask.findMany({
        where: { userId: req.userId! },
        include: {
          task: {
            include: {
              assignedTo: { select: { id: true, name: true, email: true } },
              list: { select: { id: true, name: true } },
              workspace: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { addedAt: 'asc' },
      });

      res.json(myDayTasks);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/my-day/suggestions', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Get user's workspaces
      const workspaceMemberships = await prisma.workspaceMember.findMany({
        where: { userId: req.userId! },
        select: { workspaceId: true },
      });

      const workspaceIds = workspaceMemberships.map(m => m.workspaceId);

      // Get overdue tasks, due today, and high priority tasks
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const suggestions = await prisma.task.findMany({
        where: {
          workspaceId: { in: workspaceIds },
          status: { in: ['TODO', 'IN_PROGRESS'] },
          OR: [
            { dueDate: { lte: now } }, // Overdue
            {
              AND: [
                { dueDate: { gte: today } },
                { dueDate: { lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } }
              ]
            }, // Due today
            { priority: 'HIGH' }, // High priority
          ],
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          list: { select: { id: true, name: true } },
          workspace: { select: { id: true, name: true } },
        },
        orderBy: [
          { dueDate: 'asc' },
          { priority: 'desc' },
        ],
        take: 10,
      });

      // Filter out tasks already in My Day
      const existingMyDayTaskIds = await prisma.myDayTask.findMany({
        where: { userId: req.userId! },
        select: { taskId: true },
      });

      const existingTaskIds = new Set(existingMyDayTaskIds.map(t => t.taskId));

      const filteredSuggestions = suggestions.filter(task => !existingTaskIds.has(task.id));

      res.json({
        suggestions: filteredSuggestions,
        count: filteredSuggestions.length,
      });
    } catch (error: any) {
      next(error);
    }
  });

  // Task Templates endpoints
  app.post('/api/templates', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { name, description, defaultPriority, checklistItems, workspaceId } = req.body;

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const template = await prisma.taskTemplate.create({
        data: {
          name,
          description,
          defaultPriority: defaultPriority || 'MEDIUM',
          checklistItems: checklistItems ? JSON.stringify(checklistItems) : null,
          workspaceId,
          createdById: req.userId!,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json(template);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/workspaces/:workspaceId/templates', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const templates = await prisma.taskTemplate.findMany({
        where: { workspaceId: req.params.workspaceId },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Parse checklistItems JSON
      const processedTemplates = templates.map(template => ({
        ...template,
        checklistItems: template.checklistItems ? JSON.parse(template.checklistItems) : null,
      }));

      res.json(processedTemplates);
    } catch (error: any) {
      next(error);
    }
  });

  app.delete('/api/templates/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const template = await prisma.taskTemplate.findUnique({
        where: { id: req.params.id },
        select: { workspaceId: true, createdById: true },
      });

      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      // Verify workspace access and ownership
      const hasAccess = await verifyWorkspaceAccess(req.userId!, template.workspaceId);
      if (!hasAccess || template.createdById !== req.userId!) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await prisma.taskTemplate.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  });

  // Time Tracking endpoints
  app.post('/api/tasks/:taskId/time/start', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        select: { workspaceId: true },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, task.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this task' });
      }

      // Check if there's already an active time entry for this user on this task
      const activeEntry = await prisma.timeEntry.findFirst({
        where: {
          taskId: req.params.taskId,
          userId: req.userId!,
          endTime: null,
        },
      });

      if (activeEntry) {
        return res.status(409).json({ message: 'Time tracking already active for this task' });
      }

      const timeEntry = await prisma.timeEntry.create({
        data: {
          taskId: req.params.taskId,
          userId: req.userId!,
          startTime: new Date(),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json(timeEntry);
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/tasks/:taskId/time/stop', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        select: { workspaceId: true },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, task.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this task' });
      }

      // Find active time entry
      const activeEntry = await prisma.timeEntry.findFirst({
        where: {
          taskId: req.params.taskId,
          userId: req.userId!,
          endTime: null,
        },
      });

      if (!activeEntry) {
        return res.status(404).json({ message: 'No active time tracking session found' });
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - activeEntry.startTime.getTime()) / 1000);

      const updatedEntry = await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          endTime,
          duration,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.json(updatedEntry);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/tasks/:taskId/time', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        select: { workspaceId: true },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, task.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this task' });
      }

      const timeEntries = await prisma.timeEntry.findMany({
        where: { taskId: req.params.taskId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { startTime: 'desc' },
      });

      // Calculate total time spent
      const totalDuration = timeEntries
        .filter(entry => entry.duration)
        .reduce((total, entry) => total + entry.duration!, 0);

      res.json({
        entries: timeEntries,
        totalDuration,
        activeEntry: timeEntries.find(entry => !entry.endTime) || null,
      });
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/users/:userId/time/analytics', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Only allow users to view their own analytics
      if (req.params.userId !== req.userId!) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const { startDate, endDate } = req.query;

      const whereClause: any = {
        userId: req.userId!,
      };

      if (startDate && endDate) {
        whereClause.startTime = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      const timeEntries = await prisma.timeEntry.findMany({
        where: whereClause,
        include: {
          task: {
            include: {
              list: { select: { id: true, name: true } },
              workspace: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { startTime: 'desc' },
      });

      // Group by date and calculate daily totals
      const dailyStats = timeEntries.reduce((acc, entry) => {
        if (!entry.duration) return acc;

        const date = entry.startTime.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { totalDuration: 0, entries: [] };
        }
        acc[date].totalDuration += entry.duration;
        acc[date].entries.push(entry);
        return acc;
      }, {} as Record<string, { totalDuration: number; entries: any[] }>);

      const totalDuration = timeEntries
        .filter(entry => entry.duration)
        .reduce((total, entry) => total + entry.duration!, 0);

      res.json({
        totalDuration,
        entryCount: timeEntries.length,
        dailyStats,
        recentEntries: timeEntries.slice(0, 10),
      });
    } catch (error: any) {
      next(error);
    }
  });

  // Chat endpoints
  app.post('/api/channels', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { name, type, listId, workspaceId } = req.body;

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const channel = await prisma.channel.create({
        data: {
          name,
          type,
          listId: type === 'LIST_CHANNEL' ? listId : null,
          workspaceId,
        },
        include: {
          workspace: { select: { id: true, name: true } },
          list: { select: { id: true, name: true } },
        },
      });

      // Add creator as a member
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId: req.userId!,
        },
      });

      res.status(201).json(channel);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/workspaces/:workspaceId/channels', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      const channels = await prisma.channel.findMany({
        where: { workspaceId: req.params.workspaceId },
        include: {
          list: { select: { id: true, name: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: {
            select: { messages: true, members: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json(channels);
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/channels/:channelId/join', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findUnique({
        where: { id: req.params.channelId },
        select: { workspaceId: true },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, channel.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      // Check if already a member
      const existingMember = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId: req.params.channelId,
            userId: req.userId!,
          },
        },
      });

      if (existingMember) {
        return res.status(409).json({ message: 'Already a member of this channel' });
      }

      const member = await prisma.channelMember.create({
        data: {
          channelId: req.params.channelId,
          userId: req.userId!,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(201).json(member);
    } catch (error: any) {
      next(error);
    }
  });

  // Update channel settings
  app.put('/api/channels/:channelId', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { name, type } = req.body;

      // Verify channel access and ownership
      const channel = await prisma.channel.findUnique({
        where: { id: req.params.channelId },
        include: {
          workspace: true,
        },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      if (channel.workspace.ownerId !== req.userId!) {
        return res.status(403).json({ message: 'Only workspace owner can update channels' });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (type) updateData.type = type;

      const updatedChannel = await prisma.channel.update({
        where: { id: req.params.channelId },
        data: updateData,
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          _count: {
            select: { messages: true, members: true },
          },
        },
      });

      res.json(updatedChannel);
    } catch (error: any) {
      next(error);
    }
  });

  // Get channel members
  app.get('/api/channels/:channelId/members', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Verify channel exists and user has access
      const channel = await prisma.channel.findUnique({
        where: { id: req.params.channelId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          workspace: true,
        },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      // Check if user is a member of the channel or workspace
      const hasAccess = await verifyWorkspaceAccess(req.userId!, channel.workspaceId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this channel' });
      }

      res.json(channel.members);
    } catch (error) {
      routeLog(`Error fetching channel members: ${error}`, 'error');
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Add member to channel
  app.post('/api/channels/:channelId/members', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { userId } = req.body;

      // Verify channel exists and user has access
      const channel = await prisma.channel.findUnique({
        where: { id: req.params.channelId },
        include: {
          members: {
            where: { userId: req.userId! },
          },
          workspace: true,
        },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      if (channel.members.length === 0 && channel.workspace.ownerId !== req.userId!) {
        return res.status(403).json({ message: 'Access denied to this channel' });
      }

      // Check if user is already a member
      const existingMember = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId: req.params.channelId,
            userId: userId,
          },
        },
      });

      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this channel' });
      }

      // Add member
      const member = await prisma.channelMember.create({
        data: {
          channelId: req.params.channelId,
          userId: userId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json(member);
    } catch (error: any) {
      next(error);
    }
  });

  // Remove member from channel
  app.delete('/api/channels/:channelId/members/:userId', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { userId } = req.params;

      // Verify channel exists and user has access
      const channel = await prisma.channel.findUnique({
        where: { id: req.params.channelId },
        include: {
          members: {
            where: { userId: req.userId! },
          },
          workspace: true,
        },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      // Check if requester has permission (channel owner or the user themselves)
      if (channel.workspace.ownerId !== req.userId! && userId !== req.userId!) {
        return res.status(403).json({ message: 'Insufficient permissions to remove member' });
      }

      // Remove member
      await prisma.channelMember.delete({
        where: {
          channelId_userId: {
            channelId: req.params.channelId,
            userId: userId,
          },
        },
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/channels/:channelId/messages', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { content, type, metadata } = req.body;

      // Verify channel access
      const channel = await prisma.channel.findUnique({
        where: { id: req.params.channelId },
        include: {
          members: {
            where: { userId: req.userId! },
          },
        },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      if (channel.members.length === 0) {
        return res.status(403).json({ message: 'Access denied to this channel' });
      }

      const message = await prisma.message.create({
        data: {
          channelId: req.params.channelId,
          authorId: req.userId!,
          content,
          type: type || 'TEXT',
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          reactions: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Broadcast to channel subscribers
      wsManager.broadcastToChannel(req.params.channelId, {
        type: 'message:created',
        payload: message,
      }, req.userId);

      res.status(201).json(message);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/channels/:channelId/messages', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { limit = 50, before } = req.query;

      // Verify channel access
      const channel = await prisma.channel.findUnique({
        where: { id: req.params.channelId },
        include: {
          members: {
            where: { userId: req.userId! },
          },
        },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      if (channel.members.length === 0) {
        return res.status(403).json({ message: 'Access denied to this channel' });
      }

      const messages = await prisma.message.findMany({
        where: {
          channelId: req.params.channelId,
          ...(before && { createdAt: { lt: new Date(before as string) } }),
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          reactions: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
      });

      res.json(messages.reverse()); // Return in chronological order
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/messages/:messageId/reactions', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { emoji } = req.body;

      const message = await prisma.message.findUnique({
        where: { id: req.params.messageId },
        select: { channelId: true },
      });

      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      // Verify channel access
      const channel = await prisma.channel.findUnique({
        where: { id: message.channelId },
        include: {
          members: {
            where: { userId: req.userId! },
          },
        },
      });

      if (!channel || channel.members.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const reaction = await prisma.messageReaction.create({
        data: {
          messageId: req.params.messageId,
          userId: req.userId!,
          emoji,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      res.status(201).json(reaction);
    } catch (error: any) {
      // Handle unique constraint violation (reaction already exists)
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Reaction already exists' });
      }
      next(error);
    }
  });

  app.delete('/api/messages/:messageId/reactions/:emoji', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { emoji } = req.params;

      await prisma.messageReaction.deleteMany({
        where: {
          messageId: req.params.messageId,
          userId: req.userId!,
          emoji,
        },
      });

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  });

  // Presence endpoints
  app.get('/api/users/presence', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { userIds } = req.query;

      const userIdArray = Array.isArray(userIds) ? userIds : userIds ? [userIds] : [];

      const presenceRecords = await prisma.userPresence.findMany({
        where: {
          userId: { in: userIdArray },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.json(presenceRecords);
    } catch (error: any) {
      next(error);
    }
  });

  app.put('/api/users/presence', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { status, customMessage } = req.body;

      const presence = await prisma.userPresence.upsert({
        where: { userId: req.userId! },
        update: {
          status,
          customMessage,
          lastSeen: new Date(),
          updatedAt: new Date(),
        },
        create: {
          userId: req.userId!,
          status,
          customMessage,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Broadcast presence update
      wsManager.broadcastPresenceUpdate(req.userId!, presence);

      res.json(presence);
    } catch (error: any) {
      next(error);
    }
  });

  // Mention endpoints
  app.post('/api/messages/:messageId/mentions', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { mentionedUserIds } = req.body;

      // Verify message access
      const message = await prisma.message.findUnique({
        where: { id: req.params.messageId },
        select: { channelId: true },
      });

      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      // Create notifications for mentions
      const notifications = await Promise.all(
        mentionedUserIds.map(async (userId: string) => {
          return prisma.notification.create({
            data: {
              userId,
              type: 'mention',
              data: JSON.stringify({
                messageId: req.params.messageId,
                channelId: message.channelId,
                mentionedBy: req.userId,
              }),
            },
          });
        })
      );

      res.status(201).json(notifications);
    } catch (error: any) {
      next(error);
    }
  });

  // AI Routes
  app.post('/api/ai/summarize-task', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const data = aiSummarizeSchema.parse(req.body);
      const summary = await summarizeTask(data.title, data.description);

      res.json({ summary });
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/ai/generate-subtasks', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const data = aiGenerateSubtasksSchema.parse(req.body);
      const subtasks = await generateSubtasks(data.title, data.description);

      res.json({ subtasks });
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/ai/prioritize-tasks', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const data = aiPrioritizeTasksSchema.parse(req.body);
      const tasks = await prioritizeTasks(data.tasks);

      res.json({ tasks });
    } catch (error: any) {
      next(error);
    }
  });

  // Notification Routes
  app.get('/api/notifications', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: req.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      res.json(notifications);
    } catch (error: any) {
      next(error);
    }
  });

  app.patch('/api/notifications/:id/read', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: req.params.id,
          userId: req.userId,
        },
        data: {
          isRead: true,
        },
      });

      res.json(notification);
    } catch (error: any) {
      next(error);
    }
  });

  app.patch('/api/notifications/mark-all-read', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      await prisma.notification.updateMany({
        where: {
          userId: req.userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // Workspace Invitation Routes
  app.post('/api/workspaces/:workspaceId/invitations', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      routeLog(`Creating invitation for workspace ${req.params.workspaceId} by user ${req.userId}`);
      
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        routeLog(`Access denied: User ${req.userId} does not have access to workspace ${req.params.workspaceId}`, 'warn');
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      // Check if user has MANAGE_MEMBERS permission
      const userPermissions = await getUserWorkspacePermissions(req.userId!, req.params.workspaceId);
      routeLog(`User ${req.userId} permissions for workspace ${req.params.workspaceId}: ${userPermissions.join(', ')}`);
      
      if (!userPermissions.includes('MANAGE_MEMBERS')) {
        routeLog(`Permission denied: User ${req.userId} does not have MANAGE_MEMBERS permission`, 'warn');
        return res.status(403).json({ message: 'You do not have permission to invite members' });
      }

      const { email, role } = req.body;

      // Validate email
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        routeLog(`Invalid email provided: ${email}`, 'warn');
        return res.status(400).json({ message: 'Valid email is required' });
      }

      // Check if user already exists and is a member
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        const existingMember = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: req.params.workspaceId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMember) {
          return res.status(400).json({ message: 'User is already a member of this workspace' });
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await prisma.workspaceInvitation.findUnique({
        where: {
          workspaceId_email: {
            workspaceId: req.params.workspaceId,
            email,
          },
        },
      });

      if (existingInvitation && existingInvitation.expiresAt > new Date()) {
        return res.status(400).json({ message: 'An invitation has already been sent to this email' });
      }

      // Generate secure token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');

      // Set expiry to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create or update invitation
      const invitation = await prisma.workspaceInvitation.upsert({
        where: {
          workspaceId_email: {
            workspaceId: req.params.workspaceId,
            email,
          },
        },
        update: {
          token,
          role: role || 'MEMBER',
          expiresAt,
        },
        create: {
          workspaceId: req.params.workspaceId,
          email,
          role: role || 'MEMBER',
          token,
          expiresAt,
        },
        include: {
          workspace: {
            select: {
              name: true,
            },
          },
        },
      });

      routeLog(`Invitation created successfully: ${invitation.id} for email ${email} to workspace ${req.params.workspaceId}`);

      // In a real app, send email here
      // For now, return the invitation link in the response
      // Use APP_URL environment variable in production, otherwise use request headers
      const appUrl = process.env.APP_URL;
      let invitationLink: string;
      
      if (appUrl) {
        // Production: use explicit APP_URL (e.g., https://yourdomain.com)
        invitationLink = `${appUrl.replace(/\/$/, '')}/invite/${token}`;
      } else {
        // Development: use request headers
        const host = req.get('host');
        const protocol = req.protocol || (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http'));
        invitationLink = `${protocol}://${host}/invite/${token}`;
      }

      res.status(201).json({
        message: 'Invitation created successfully',
        invitationLink, // In production, this would be sent via email
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      });
    } catch (error: any) {
      routeLog(`Error creating invitation: ${error.message}`, 'error');
      const prismaError = handlePrismaError(error, 'Create invitation');
      next(prismaError);
    }
  });

  // Get invitation details (public endpoint for invitation page)
  app.get('/api/invitations/:token', async (req, res, next) => {
    try {
      routeLog(`Fetching invitation details for token: ${req.params.token}`);
      
      const invitation = await prisma.workspaceInvitation.findUnique({
        where: { token: req.params.token },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!invitation) {
        routeLog(`Invitation not found: ${req.params.token}`, 'warn');
        return res.status(404).json({ message: 'Invitation not found' });
      }

      if (invitation.expiresAt < new Date()) {
        routeLog(`Invitation expired: ${req.params.token}`, 'warn');
        return res.status(410).json({ message: 'Invitation has expired' });
      }

      routeLog(`Invitation found for email: ${invitation.email}, workspace: ${invitation.workspace.name}`);
      
      res.json({
        email: invitation.email,
        role: invitation.role,
        workspace: invitation.workspace,
        expiresAt: invitation.expiresAt,
      });
    } catch (error: any) {
      routeLog(`Error fetching invitation: ${error.message}`, 'error');
      const prismaError = handlePrismaError(error, 'Fetch invitation');
      next(prismaError);
    }
  });

  // Get pending invitations for a workspace
  app.get('/api/workspaces/:workspaceId/invitations', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      routeLog(`Fetching invitations for workspace ${req.params.workspaceId} by user ${req.userId}`);
      
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        routeLog(`Access denied: User ${req.userId} does not have access to workspace ${req.params.workspaceId}`, 'warn');
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      // Check if user has MANAGE_MEMBERS permission
      const userPermissions = await getUserWorkspacePermissions(req.userId!, req.params.workspaceId);
      if (!userPermissions.includes('MANAGE_MEMBERS')) {
        routeLog(`Permission denied: User ${req.userId} does not have MANAGE_MEMBERS permission`, 'warn');
        return res.status(403).json({ message: 'You do not have permission to view invitations' });
      }

      const invitations = await prisma.workspaceInvitation.findMany({
        where: { 
          workspaceId: req.params.workspaceId,
          expiresAt: {
            gt: new Date(), // Only return non-expired invitations
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      routeLog(`Found ${invitations.length} pending invitation(s) for workspace ${req.params.workspaceId}`);
      res.json(invitations);
    } catch (error: any) {
      routeLog(`Error fetching invitations: ${error.message}`, 'error');
      const prismaError = handlePrismaError(error, 'Fetch invitations');
      next(prismaError);
    }
  });

  // Delete an invitation
  app.delete('/api/workspaces/:workspaceId/invitations/:invitationId', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      routeLog(`Deleting invitation ${req.params.invitationId} from workspace ${req.params.workspaceId} by user ${req.userId}`);
      
      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(req.userId!, req.params.workspaceId);
      if (!hasAccess) {
        routeLog(`Access denied: User ${req.userId} does not have access to workspace ${req.params.workspaceId}`, 'warn');
        return res.status(403).json({ message: 'Access denied to this workspace' });
      }

      // Check if user has MANAGE_MEMBERS permission
      const userPermissions = await getUserWorkspacePermissions(req.userId!, req.params.workspaceId);
      if (!userPermissions.includes('MANAGE_MEMBERS')) {
        routeLog(`Permission denied: User ${req.userId} does not have MANAGE_MEMBERS permission`, 'warn');
        return res.status(403).json({ message: 'You do not have permission to delete invitations' });
      }

      // Verify invitation belongs to this workspace
      const invitation = await prisma.workspaceInvitation.findUnique({
        where: { id: req.params.invitationId },
      });

      if (!invitation) {
        routeLog(`Invitation not found: ${req.params.invitationId}`, 'warn');
        return res.status(404).json({ message: 'Invitation not found' });
      }

      if (invitation.workspaceId !== req.params.workspaceId) {
        routeLog(`Invitation ${req.params.invitationId} does not belong to workspace ${req.params.workspaceId}`, 'warn');
        return res.status(403).json({ message: 'Invitation does not belong to this workspace' });
      }

      await prisma.workspaceInvitation.delete({
        where: { id: req.params.invitationId },
      });

      routeLog(`Invitation ${req.params.invitationId} deleted successfully`);
      res.json({ message: 'Invitation deleted successfully' });
    } catch (error: any) {
      routeLog(`Error deleting invitation: ${error.message}`, 'error');
      const prismaError = handlePrismaError(error, 'Delete invitation');
      next(prismaError);
    }
  });

  // Accept invitation
  app.post('/api/invitations/:token/accept', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      routeLog(`Accepting invitation with token: ${req.params.token} by user ${req.userId}`);
      
      const invitation = await prisma.workspaceInvitation.findUnique({
        where: { token: req.params.token },
      });

      if (!invitation) {
        routeLog(`Invitation not found: ${req.params.token}`, 'warn');
        return res.status(404).json({ message: 'Invitation not found' });
      }

      if (invitation.expiresAt < new Date()) {
        routeLog(`Invitation expired: ${req.params.token}`, 'warn');
        return res.status(410).json({ message: 'Invitation has expired' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
      });

      if (!user) {
        routeLog(`User not found: ${req.userId}`, 'error');
        return res.status(404).json({ message: 'User not found' });
      }

      routeLog(`Checking email match: invitation=${invitation.email}, user=${user.email}`);

      // Verify email matches (case-insensitive)
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        routeLog(`Email mismatch: invitation=${invitation.email}, user=${user.email}`, 'warn');
        return res.status(403).json({ 
          message: 'This invitation was sent to a different email address. Please sign in with the email address that received the invitation.',
          invitedEmail: invitation.email,
          yourEmail: user.email,
        });
      }

      // Check if already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId: user.id,
          },
        },
      });

      if (existingMember) {
        routeLog(`User ${user.id} is already a member of workspace ${invitation.workspaceId}`, 'info');
        // Delete invitation and return success
        await prisma.workspaceInvitation.delete({
          where: { id: invitation.id },
        });
        return res.json({ 
          message: 'You are already a member of this workspace',
          workspaceId: invitation.workspaceId,
        });
      }

      // Add user as workspace member
      await prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
        },
      });

      routeLog(`User ${user.id} added as ${invitation.role} to workspace ${invitation.workspaceId}`);

      // Delete the invitation
      await prisma.workspaceInvitation.delete({
        where: { id: invitation.id },
      });

      routeLog(`Invitation ${invitation.id} accepted and deleted successfully`);

      res.json({
        message: 'Invitation accepted successfully',
        workspaceId: invitation.workspaceId,
      });
    } catch (error: any) {
      routeLog(`Error accepting invitation: ${error.message}`, 'error');
      const prismaError = handlePrismaError(error, 'Accept invitation');
      next(prismaError);
    }
  });

  // Fix endpoint: Add owner as member to workspaces that are missing it
  app.post('/api/admin/fix-workspace-members', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      // Find all workspaces where the owner is not a member
      const workspaces = await prisma.workspace.findMany({
        where: {
          ownerId: req.userId!,
        },
        include: {
          members: {
            where: {
              userId: req.userId!,
            },
          },
        },
      });

      const fixed: string[] = [];
      for (const workspace of workspaces) {
        if (workspace.members.length === 0) {
          // Owner is not a member, add them
          await prisma.workspaceMember.create({
            data: {
              workspaceId: workspace.id,
              userId: req.userId!,
              role: 'OWNER',
            },
          });
          fixed.push(workspace.id);
        }
      }

      res.json({ 
        success: true, 
        message: `Fixed ${fixed.length} workspace(s)`,
        fixedWorkspaces: fixed,
      });
    } catch (error: any) {
      next(error);
    }
  });

  // Organization endpoints for Teams-like functionality
  app.get('/api/organization/users', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(404).json({ message: 'User not part of an organization' });
      }

      const { search, limit = '20' } = req.query;
      const searchLimit = Math.min(parseInt(limit as string), 50);

      const where: any = {
        organizationId: req.user.organizationId,
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          presence: {
            select: {
              status: true,
              customMessage: true,
              lastSeen: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        take: searchLimit,
      });

      res.json(users);
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/organization/users/search', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(404).json({ message: 'User not part of an organization' });
      }

      const { q, limit = '10' } = req.query;
      const searchLimit = Math.min(parseInt(limit as string), 20);

      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json([]);
      }

      const users = await prisma.user.findMany({
        where: {
          organizationId: req.user.organizationId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          presence: {
            select: {
              status: true,
              lastSeen: true,
            },
          },
        },
        orderBy: [
          { name: 'asc' },
          { email: 'asc' },
        ],
        take: searchLimit,
      });

      res.json(users);
    } catch (error: any) {
      next(error);
    }
  });

  // Get organization info
  app.get('/api/organization', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(404).json({ message: 'User not part of an organization' });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        select: {
          id: true,
          name: true,
          domain: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              workspaces: true,
            },
          },
        },
      });

      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      res.json(organization);
    } catch (error: any) {
      next(error);
    }
  });

  // Setup first admin user (one-time use)
  app.post('/api/admin/setup-first-admin', authenticateToken, async (req, res, next) => {
    try {
      // Check if any admin users already exist
      const adminCount = await prisma.user.count({
        where: { isAdmin: true },
      });

      if (adminCount > 0) {
        return res.status(403).json({ message: 'Admin users already exist' });
      }

      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isAdmin: true },
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
        },
      });

      routeLog(`First admin user set up: ${user.email} (${user.id})`);
      res.json({
        message: 'First admin user has been set up successfully',
        user,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'User not found' });
      }
      next(error);
    }
  });

  // Admin endpoints - require admin access
  app.get('/api/admin/users', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
      const { page = '1', limit = '20', search } = req.query;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            isAdmin: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
                domain: true,
              },
            },
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                ownedWorkspaces: true,
                workspaceMemberships: true,
                createdTasks: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      next(error);
    }
  });

  app.get('/api/admin/organizations', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
      const { page = '1', limit = '20', search } = req.query;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { domain: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          include: {
            _count: {
              select: {
                users: true,
                workspaces: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.organization.count({ where }),
      ]);

      res.json({
        organizations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/admin/organizations', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
      const { domain, name } = req.body;

      if (!domain || !name) {
        return res.status(400).json({ message: 'Domain and name are required' });
      }

      const organization = await prisma.organization.create({
        data: { domain, name },
        include: {
          _count: {
            select: {
              users: true,
              workspaces: true,
            },
          },
        },
      });

      routeLog(`Admin created organization: ${organization.name} (${domain})`);
      res.json(organization);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Organization with this domain already exists' });
      }
      next(error);
    }
  });

  app.put('/api/admin/organizations/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { domain, name } = req.body;

      const organization = await prisma.organization.update({
        where: { id },
        data: { domain, name },
        include: {
          _count: {
            select: {
              users: true,
              workspaces: true,
            },
          },
        },
      });

      routeLog(`Admin updated organization: ${organization.name} (${domain})`);
      res.json(organization);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Organization not found' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Organization with this domain already exists' });
      }
      next(error);
    }
  });

  app.delete('/api/admin/organizations/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;

      // Check if organization has users
      const userCount = await prisma.user.count({
        where: { organizationId: id },
      });

      if (userCount > 0) {
        return res.status(409).json({
          message: 'Cannot delete organization with active users. Move users to another organization first.'
        });
      }

      await prisma.organization.delete({
        where: { id },
      });

      routeLog(`Admin deleted organization: ${id}`);
      res.json({ message: 'Organization deleted successfully' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Organization not found' });
      }
      next(error);
    }
  });

  app.put('/api/admin/users/:id/organization', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { organizationId } = req.body;

      // If setting organizationId to null, allow it
      // Otherwise, verify the organization exists
      if (organizationId) {
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
        });
        if (!organization) {
          return res.status(404).json({ message: 'Organization not found' });
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: { organizationId: organizationId || null },
        select: {
          id: true,
          email: true,
          name: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
        },
      });

      routeLog(`Admin moved user ${user.email} to organization ${organizationId || 'none'}`);
      res.json(user);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'User not found' });
      }
      next(error);
    }
  });

  app.put('/api/admin/users/:id/admin', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { isAdmin } = req.body;

      if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ message: 'isAdmin must be a boolean' });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { isAdmin },
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
        },
      });

      routeLog(`Admin ${isAdmin ? 'granted' : 'revoked'} admin access for user ${user.email}`);
      res.json(user);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'User not found' });
      }
      next(error);
    }
  });

  app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
      const [
        totalUsers,
        totalOrganizations,
        totalWorkspaces,
        totalTasks,
        adminUsers,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.organization.count(),
        prisma.workspace.count(),
        prisma.task.count(),
        prisma.user.count({ where: { isAdmin: true } }),
      ]);

      res.json({
        totalUsers,
        totalOrganizations,
        totalWorkspaces,
        totalTasks,
        adminUsers,
      });
    } catch (error: any) {
      next(error);
    }
  });

    const httpServer = createServer(app);
    routeLog('All routes registered successfully');

    return httpServer;
  } catch (error) {
    routeLog(`Failed to register routes: ${error}`, 'error');
    throw error;
  }
}
