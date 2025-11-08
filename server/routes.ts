import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, generateTokens, type AuthRequest } from './middleware/auth';
import { summarizeTask, generateSubtasks, prioritizeTasks } from './services/ai';
import { wsManager } from './websocket';
import { logTaskCreated, logTaskStatusChanged, logTaskPriorityChanged, logTaskAssigned, logTaskUnassigned, logTaskMoved, logCommentAdded } from './activityLogger';
import { getUserWorkspacePermissions, updateMemberPermissions, ROLE_PERMISSIONS } from './permissions';
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

const prisma = new PrismaClient();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth Routes
  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const workspace = await prisma.workspace.create({
        data: {
          name: 'My Workspace',
          slug: 'my-workspace',
          ownerId: user.id,
        },
      });

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

      const tokens = generateTokens(user.id);

      res.status(201).json({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const tokens = generateTokens(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error: any) {
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
        orderBy: { createdAt: 'asc' },
      });

      res.json(workspaces);
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

  app.post('/api/workspaces/:id/invitations', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { email, role } = req.body;

      // Check if requester has MANAGE_MEMBERS permission
      const permissions = await getUserWorkspacePermissions(req.userId!, req.params.id);
      if (!permissions.includes('MANAGE_MEMBERS' as any)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found. They need to register first.' });
      }

      // Check if user is already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: req.params.id,
            userId: user.id,
          },
        },
      });

      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this workspace' });
      }

      // Add user to workspace
      const member = await prisma.workspaceMember.create({
        data: {
          workspaceId: req.params.id,
          userId: user.id,
          role: role || 'MEMBER',
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

      res.json(list);
    } catch (error: any) {
      next(error);
    }
  });

  app.post('/api/workspaces/:workspaceId/lists', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
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

  // Create inbox task (no list assignment)
  app.post('/api/workspaces/:workspaceId/tasks', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
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

      // Get the list to retrieve workspaceId
      const list = await prisma.list.findUnique({
        where: { id: req.params.listId },
        select: { workspaceId: true },
      });

      if (!list) {
        return res.status(404).json({ message: 'List not found' });
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

      const attachment = await prisma.fileAttachment.create({
        data: {
          taskId: req.params.id,
          filename: req.file.filename,
          originalName: req.file.originalname,
          filepath: req.file.path,
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
          metadata: JSON.stringify({ filename: req.file.originalname, attachmentId: attachment.id }),
        },
      });

      res.status(201).json(attachment);
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

  const httpServer = createServer(app);

  return httpServer;
}
