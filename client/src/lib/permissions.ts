import type { Role } from '@shared/schema';

export type Permission = 
  | 'MANAGE_WORKSPACE'
  | 'MANAGE_MEMBERS'
  | 'MANAGE_LISTS'
  | 'CREATE_TASKS'
  | 'EDIT_ALL_TASKS'
  | 'DELETE_TASKS'
  | 'COMMENT_TASKS'
  | 'VIEW_ONLY';

// Default permissions for each role (must match server/permissions.ts)
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
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
};

export function getPermissionsForRole(role: Role | null): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: Role | null, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}
