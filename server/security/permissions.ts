import { ForbiddenError } from '@/lib/errors'
import type { Permission, UserRole } from '@/types/domain'

const PERMISSION_MATRIX: Record<Permission, UserRole[]> = {
  'dashboard:view': ['super_admin', 'admin', 'manager', 'viewer'],
  'players:import': ['super_admin', 'admin', 'manager'],
  'scores:import': ['super_admin', 'admin', 'manager'],
  'weeks:manage': ['super_admin', 'admin'],
  'scores:edit': ['super_admin', 'admin', 'manager'],
  'trains:trigger': ['super_admin', 'admin', 'manager'],
  'trains:configure': ['super_admin', 'admin', 'manager'],
  'players:manage': ['super_admin', 'admin', 'manager'],
  'rating:configure': ['super_admin', 'admin', 'manager'],
  'rating:recalculate': ['super_admin', 'admin', 'manager'],
  'audit:view': ['super_admin', 'admin'],
  'users:invite': ['super_admin', 'admin'],
  'users:manage': ['super_admin', 'admin'],
  'users:promote_admin': ['super_admin'],
  'settings:configure': ['super_admin'],
  'admin:view': ['super_admin', 'admin'],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[permission].includes(role)
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(
      `Role "${role}" is not allowed to perform "${permission}"`,
    )
  }
}
