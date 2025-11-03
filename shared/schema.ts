import { z } from "zod";

// Enums
export const RoleEnum = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
export const TaskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export type Role = z.infer<typeof RoleEnum>;
export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

// User schemas
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Workspace schemas
export const insertWorkspaceSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// List schemas
export const insertListSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isPersonal: z.boolean().default(false),
});

export type InsertList = z.infer<typeof insertListSchema>;

export interface List {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isPersonal: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

// Task schemas
export const insertTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusEnum.default('TODO'),
  priority: TaskPriorityEnum.default('MEDIUM'),
  dueDate: z.string().optional(),
  assignedToId: z.string().optional(),
  parentId: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  dueDate: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export interface Task {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assignedToId: string | null;
  createdById: string;
  parentId: string | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

// Comment schemas
export const insertCommentSchema = z.object({
  body: z.string().min(1),
});

export type InsertComment = z.infer<typeof insertCommentSchema>;

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  author?: User;
}

// Tag schemas
export const insertTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export type InsertTag = z.infer<typeof insertTagSchema>;

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: Date;
}

// AI schemas
export const aiSummarizeSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const aiGenerateSubtasksSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  context: z.string().optional(),
});

export const aiPrioritizeTasksSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    priority: TaskPriorityEnum.optional(),
  })),
});

export type AISummarize = z.infer<typeof aiSummarizeSchema>;
export type AIGenerateSubtasks = z.infer<typeof aiGenerateSubtasksSchema>;
export type AIPrioritizeTasks = z.infer<typeof aiPrioritizeTasksSchema>;
