import { PrismaClient, Role, Permission } from '@prisma/client';

const prisma = new PrismaClient();

// Default permissions for each role
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [
    'MANAGE_WORKSPACE',
    'MANAGE_MEMBERS',
    'MANAGE_LISTS',
    'CREATE_TASKS',
    'EDIT_ALL_TASKS',
    'DELETE_TASKS',
    'COMMENT_TASKS',
  ],
  ADMIN: [
    'MANAGE_MEMBERS',
    'MANAGE_LISTS',
    'CREATE_TASKS',
    'EDIT_ALL_TASKS',
    'DELETE_TASKS',
    'COMMENT_TASKS',
  ],
  MEMBER: [
    'MANAGE_LISTS',
    'CREATE_TASKS',
    'EDIT_ALL_TASKS',
    'COMMENT_TASKS',
  ],
  VIEWER: [
    'VIEW_ONLY',
    'COMMENT_TASKS',
  ],
};

export async function getUserWorkspacePermissions(userId: string, workspaceId: string): Promise<Permission[]> {
  // First check if user is the workspace owner
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });

  if (!workspace) {
    return [];
  }

  // If user is the workspace owner, they have all OWNER permissions
  if (workspace.ownerId === userId) {
    return ROLE_PERMISSIONS.OWNER;
  }

  // Otherwise, check if user is a member
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!member) {
    return [];
  }

  // If custom permissions are set, use those
  if (member.permissions) {
    try {
      return JSON.parse(member.permissions) as Permission[];
    } catch {
      // Fall back to role-based permissions if parsing fails
    }
  }

  // Otherwise use default role-based permissions
  return ROLE_PERMISSIONS[member.role] || [];
}

export async function hasPermission(userId: string, workspaceId: string, permission: Permission): Promise<boolean> {
  const permissions = await getUserWorkspacePermissions(userId, workspaceId);
  return permissions.includes(permission);
}

export async function hasAnyPermission(userId: string, workspaceId: string, requiredPermissions: Permission[]): Promise<boolean> {
  const permissions = await getUserWorkspacePermissions(userId, workspaceId);
  return requiredPermissions.some(p => permissions.includes(p));
}

export async function updateMemberPermissions(workspaceId: string, userId: string, permissions: Permission[]): Promise<void> {
  await prisma.workspaceMember.update({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    data: {
      permissions: JSON.stringify(permissions),
    },
  });
}

export { ROLE_PERMISSIONS };
