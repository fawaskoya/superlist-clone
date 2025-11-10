import { ActivityType } from '@prisma/client';
import { prisma } from './database.js';

interface ActivityMetadata {
  oldValue?: any;
  newValue?: any;
  fieldName?: string;
  relatedId?: string;
  relatedName?: string;
}

export async function logActivity(
  taskId: string,
  userId: string,
  type: ActivityType,
  metadata?: ActivityMetadata
) {
  try {
    await prisma.taskActivity.create({
      data: {
        taskId,
        userId,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export async function logTaskCreated(taskId: string, userId: string) {
  return logActivity(taskId, userId, 'TASK_CREATED');
}

export async function logTaskUpdated(
  taskId: string,
  userId: string,
  fieldName: string,
  oldValue: any,
  newValue: any
) {
  return logActivity(taskId, userId, 'TASK_UPDATED', {
    fieldName,
    oldValue,
    newValue,
  });
}

export async function logTaskStatusChanged(
  taskId: string,
  userId: string,
  oldStatus: string,
  newStatus: string
) {
  return logActivity(taskId, userId, 'TASK_STATUS_CHANGED', {
    oldValue: oldStatus,
    newValue: newStatus,
  });
}

export async function logTaskPriorityChanged(
  taskId: string,
  userId: string,
  oldPriority: string,
  newPriority: string
) {
  return logActivity(taskId, userId, 'TASK_PRIORITY_CHANGED', {
    oldValue: oldPriority,
    newValue: newPriority,
  });
}

export async function logTaskAssigned(
  taskId: string,
  userId: string,
  assignedToId: string,
  assignedToName: string
) {
  return logActivity(taskId, userId, 'TASK_ASSIGNED', {
    relatedId: assignedToId,
    relatedName: assignedToName,
  });
}

export async function logTaskUnassigned(
  taskId: string,
  userId: string,
  unassignedFromId: string,
  unassignedFromName: string
) {
  return logActivity(taskId, userId, 'TASK_UNASSIGNED', {
    relatedId: unassignedFromId,
    relatedName: unassignedFromName,
  });
}

export async function logTaskMoved(
  taskId: string,
  userId: string,
  oldListId: string,
  oldListName: string,
  newListId: string,
  newListName: string
) {
  return logActivity(taskId, userId, 'TASK_MOVED', {
    oldValue: oldListName,
    newValue: newListName,
  });
}

export async function logSubtaskAdded(
  taskId: string,
  userId: string,
  subtaskId: string,
  subtaskTitle: string
) {
  return logActivity(taskId, userId, 'SUBTASK_ADDED', {
    relatedId: subtaskId,
    relatedName: subtaskTitle,
  });
}

export async function logCommentAdded(
  taskId: string,
  userId: string,
  commentId: string
) {
  return logActivity(taskId, userId, 'COMMENT_ADDED', {
    relatedId: commentId,
  });
}

export async function logTagAdded(
  taskId: string,
  userId: string,
  tagName: string
) {
  return logActivity(taskId, userId, 'TAG_ADDED', {
    relatedName: tagName,
  });
}

export async function logTagRemoved(
  taskId: string,
  userId: string,
  tagName: string
) {
  return logActivity(taskId, userId, 'TAG_REMOVED', {
    relatedName: tagName,
  });
}
