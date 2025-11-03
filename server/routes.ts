import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, generateTokens, type AuthRequest } from './middleware/auth';
import { summarizeTask, generateSubtasks, prioritizeTasks } from './services/ai';
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
            title: 'Welcome to KBN Superlist!',
            description: 'This is your first task. Try creating more tasks, adding subtasks, and using AI features.',
            listId: inboxList.id,
            createdById: user.id,
            status: 'TODO',
            priority: 'MEDIUM',
            orderIndex: 0,
          },
          {
            title: 'Try the AI features',
            description: 'Click on any task to open the details drawer, then use the AI buttons to summarize, generate subtasks, or get priority suggestions.',
            listId: inboxList.id,
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

  app.patch('/api/tasks/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const data = updateTaskSchema.parse(req.body);

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

      res.json(task);
    } catch (error: any) {
      next(error);
    }
  });

  app.delete('/api/tasks/:id', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      await prisma.task.delete({
        where: { id: req.params.id },
      });

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

      res.status(201).json(comment);
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

  const httpServer = createServer(app);

  return httpServer;
}
