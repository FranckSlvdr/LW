import 'server-only'

import { hasPermission } from '@/server/security/permissions'
import { MobileBottomNavClient } from './MobileBottomNavClient'
import type { AuthUser } from '@/types/domain'

interface Props {
  user: AuthUser | null
}

export async function MobileBottomNav({ user }: Props) {
  const canViewAdmin = user ? hasPermission(user.role, 'admin:view') : false
  return <MobileBottomNavClient canViewAdmin={canViewAdmin} />
}
