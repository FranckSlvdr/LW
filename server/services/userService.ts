import 'server-only'
import bcrypt from 'bcryptjs'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  createCredentials,
  findCredentialsByUserId,
  setPasswordHash,
  incrementTokenVersion,
  acceptInvite,
  findUserByInviteTokenHash,
  setResetToken,
  findUserByResetTokenHash,
} from '@/server/repositories/userRepository'
import { insertAuditLog } from '@/server/repositories/auditRepository'
import { sendInviteEmail, sendPasswordResetEmail } from '@/server/services/emailService'
import type { User, UserRole, AuthUser } from '@/types/domain'

const BCRYPT_ROUNDS = 12
const INVITE_TTL_MS = 48 * 60 * 60 * 1000   // 48 hours
const RESET_TTL_MS  = 60 * 60 * 1000         // 1 hour

// ─── Token helpers ────────────────────────────────────────────────────────────

function generateRawToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function hashToken(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function validateCredentials(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const user = await findUserByEmail(email)
  if (!user || !user.isActive) return null

  const creds = await findCredentialsByUserId(user.id)
  if (!creds || !creds.passwordHash) return null
  if (!creds.inviteAccepted) return null

  const match = await bcrypt.compare(password, creds.passwordHash)
  if (!match) return null

  return {
    id:           user.id,
    role:         user.role,
    name:         user.name,
    email:        user.email,
    tokenVersion: creds.tokenVersion,
  }
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await incrementTokenVersion(userId)
}

// ─── User management ──────────────────────────────────────────────────────────

export async function inviteUser(data: {
  email: string
  name: string
  role: UserRole
  invitedBy: AuthUser
  ipAddress?: string
}): Promise<User> {
  const existing = await findUserByEmail(data.email)
  if (existing) throw new ValidationError('Un utilisateur avec cet email existe déjà.')

  const user = await createUser({ email: data.email, name: data.name, role: data.role })

  const rawToken  = generateRawToken()
  const tokenHash = await hashToken(rawToken)
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  await createCredentials({ userId: user.id, inviteTokenHash: tokenHash, inviteExpiresAt: expiresAt })
  await sendInviteEmail(user.email, user.name, rawToken)

  await insertAuditLog({
    entityType:  'user',
    action:      'INVITE_SENT',
    afterJson:   { targetUserId: user.id, targetEmail: user.email, role: user.role },
    performedBy: data.invitedBy.email,
    userId:      data.invitedBy.id,
    userEmail:   data.invitedBy.email,
    ipAddress:   data.ipAddress,
  })

  return user
}

export async function acceptUserInvite(rawToken: string, password: string): Promise<AuthUser> {
  const tokenHash = await hashToken(rawToken)
  const user = await findUserByInviteTokenHash(tokenHash)
  if (!user) throw new ValidationError("Ce lien d'invitation est invalide ou expiré.")

  if (password.length < 12) throw new ValidationError('Le mot de passe doit contenir au moins 12 caractères.')

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  await acceptInvite(user.id, hash)

  await insertAuditLog({
    entityType: 'user',
    action:     'INVITE_ACCEPTED',
    afterJson:  { userId: user.id, email: user.email },
    performedBy: user.email,
    userId:     user.id,
    userEmail:  user.email,
  })

  const creds = await findCredentialsByUserId(user.id)
  return { id: user.id, role: user.role, name: user.name, email: user.email, tokenVersion: creds!.tokenVersion }
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function requestPasswordReset(
  email: string,
  opts: { ipAddress?: string } = {},
): Promise<void> {
  const user = await findUserByEmail(email)
  if (!user || !user.isActive) return  // silent: prevent user enumeration

  const rawToken  = generateRawToken()
  const tokenHash = await hashToken(rawToken)
  const expiresAt = new Date(Date.now() + RESET_TTL_MS)

  await setResetToken(user.id, tokenHash, expiresAt)
  await sendPasswordResetEmail(user.email, rawToken)

  await insertAuditLog({
    entityType:  'user',
    action:      'PASSWORD_RESET_REQUESTED',
    afterJson:   { userId: user.id, email: user.email },
    performedBy: user.email,
    userId:      user.id,
    userEmail:   user.email,
    ipAddress:   opts.ipAddress,
  })
}

/**
 * Admin-triggered force password reset.
 * Returns { resetUrl } when SMTP is not configured (for admin display).
 * Returns {} when email was sent via SMTP.
 */
export async function adminForcePasswordReset(
  userId: string,
  actor: AuthUser,
  opts: { ipAddress?: string } = {},
): Promise<{ resetUrl?: string }> {
  const user = await findUserById(userId)
  if (!user) throw new NotFoundError('Utilisateur introuvable.')

  const rawToken  = generateRawToken()
  const tokenHash = await hashToken(rawToken)
  const expiresAt = new Date(Date.now() + RESET_TTL_MS)

  await setResetToken(user.id, tokenHash, expiresAt)

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`

  let smtpSent = false
  if (process.env.SMTP_HOST) {
    await sendPasswordResetEmail(user.email, rawToken)
    smtpSent = true
  }

  await insertAuditLog({
    entityType:  'user',
    action:      'PASSWORD_RESET_REQUESTED',
    afterJson:   { targetUserId: user.id, targetEmail: user.email, forcedByAdmin: true, smtpSent },
    performedBy: actor.email,
    userId:      actor.id,
    userEmail:   actor.email,
    ipAddress:   opts.ipAddress,
  })

  // When SMTP is not configured, return the link so admin can share it manually
  return smtpSent ? {} : { resetUrl }
}

export async function completePasswordReset(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = await hashToken(rawToken)
  const user = await findUserByResetTokenHash(tokenHash)
  if (!user) throw new ValidationError('Ce lien de réinitialisation est invalide ou expiré.')

  if (newPassword.length < 12) throw new ValidationError('Le mot de passe doit contenir au moins 12 caractères.')

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await setPasswordHash(user.id, hash)

  await insertAuditLog({
    entityType:  'user',
    action:      'PASSWORD_RESET_COMPLETED',
    afterJson:   { userId: user.id, email: user.email },
    performedBy: user.email,
    userId:      user.id,
    userEmail:   user.email,
  })
}

// ─── Admin operations ─────────────────────────────────────────────────────────

export async function deactivateUser(
  userId: string,
  actor: AuthUser,
  opts: { ipAddress?: string } = {},
): Promise<User> {
  if (userId === actor.id) throw new ForbiddenError('Vous ne pouvez pas vous désactiver vous-même.')
  const user = await findUserById(userId)
  if (!user) throw new NotFoundError('Utilisateur introuvable.')

  await updateUser(userId, { isActive: false })
  await incrementTokenVersion(userId)

  await insertAuditLog({
    entityType:  'user',
    action:      'USER_DEACTIVATED',
    afterJson:   { targetUserId: userId, targetEmail: user.email },
    performedBy: actor.email,
    userId:      actor.id,
    userEmail:   actor.email,
    ipAddress:   opts.ipAddress,
  })

  return (await findUserById(userId))!
}

export async function activateUser(
  userId: string,
  actor: AuthUser,
  opts: { ipAddress?: string } = {},
): Promise<User> {
  const user = await findUserById(userId)
  if (!user) throw new NotFoundError('Utilisateur introuvable.')

  const updated = await updateUser(userId, { isActive: true })

  await insertAuditLog({
    entityType:  'user',
    action:      'USER_ACTIVATED',
    afterJson:   { targetUserId: userId, targetEmail: user.email },
    performedBy: actor.email,
    userId:      actor.id,
    userEmail:   actor.email,
    ipAddress:   opts.ipAddress,
  })

  return updated
}

export async function changeUserRole(
  userId: string,
  newRole: UserRole,
  actor: AuthUser,
  opts: { ipAddress?: string } = {},
): Promise<User> {
  if (userId === actor.id) throw new ForbiddenError('Vous ne pouvez pas modifier votre propre rôle.')

  const targetUser = await findUserById(userId)
  if (!targetUser) throw new NotFoundError('Utilisateur introuvable.')

  if ((newRole === 'admin' || newRole === 'super_admin') && actor.role !== 'super_admin') {
    throw new ForbiddenError('Seul un super_admin peut promouvoir à ce niveau.')
  }

  const oldRole = targetUser.role
  await updateUser(userId, { role: newRole })
  await incrementTokenVersion(userId)

  await insertAuditLog({
    entityType:  'user',
    action:      'ROLE_CHANGED',
    beforeJson:  { role: oldRole },
    afterJson:   { targetUserId: userId, targetEmail: targetUser.email, oldRole, newRole },
    performedBy: actor.email,
    userId:      actor.id,
    userEmail:   actor.email,
    ipAddress:   opts.ipAddress,
  })

  return (await findUserById(userId))!
}

export async function setUserPassword(userId: string, password: string): Promise<void> {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  await setPasswordHash(userId, hash)
}
