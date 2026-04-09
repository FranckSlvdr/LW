import 'server-only'
import { db as sql } from '@/server/db/client'
import type { User, UserCredentials, UserRole } from '@/types/domain'

// ─── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUser(row: any): User {
  return {
    id:        row.id,
    email:     row.email,
    name:      row.name,
    role:      row.role as UserRole,
    isActive:  row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCredentials(row: any): UserCredentials {
  return {
    userId:          row.user_id,
    passwordHash:    row.password_hash ?? null,
    tokenVersion:    row.token_version,
    inviteTokenHash: row.invite_token_hash ?? null,
    inviteExpiresAt: row.invite_expires_at ?? null,
    inviteAccepted:  row.invite_accepted,
    resetTokenHash:  row.reset_token_hash ?? null,
    resetExpiresAt:  row.reset_expires_at ?? null,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await sql`
    SELECT * FROM users WHERE email = lower(${email}) LIMIT 1
  `
  return rows[0] ? toUser(rows[0]) : null
}

export async function findUserById(id: string): Promise<User | null> {
  const rows = await sql`
    SELECT * FROM users WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? toUser(rows[0]) : null
}

export async function listUsers(): Promise<User[]> {
  const rows = await sql`
    SELECT * FROM users ORDER BY created_at DESC
  `
  return rows.map(toUser)
}

export async function createUser(data: {
  email: string
  name: string
  role: UserRole
}): Promise<User> {
  const rows = await sql`
    INSERT INTO users (email, name, role)
    VALUES (lower(${data.email}), ${data.name}, ${data.role})
    RETURNING *
  `
  return toUser(rows[0])
}

export async function updateUser(
  id: string,
  data: Partial<{ name: string; role: UserRole; isActive: boolean }>,
): Promise<User> {
  const rows = await sql`
    UPDATE users SET
      name      = COALESCE(${data.name ?? null}, name),
      role      = COALESCE(${data.role ?? null}::user_role, role),
      is_active = COALESCE(${data.isActive ?? null}, is_active)
    WHERE id = ${id}
    RETURNING *
  `
  return toUser(rows[0])
}

// ─── Credentials ──────────────────────────────────────────────────────────────

export async function findCredentialsByUserId(userId: string): Promise<UserCredentials | null> {
  const rows = await sql`
    SELECT * FROM user_credentials WHERE user_id = ${userId} LIMIT 1
  `
  return rows[0] ? toCredentials(rows[0]) : null
}

export async function createCredentials(data: {
  userId: string
  passwordHash?: string
  inviteTokenHash?: string
  inviteExpiresAt?: Date
}): Promise<UserCredentials> {
  const rows = await sql`
    INSERT INTO user_credentials (user_id, password_hash, invite_token_hash, invite_expires_at)
    VALUES (
      ${data.userId},
      ${data.passwordHash ?? null},
      ${data.inviteTokenHash ?? null},
      ${data.inviteExpiresAt ?? null}
    )
    RETURNING *
  `
  return toCredentials(rows[0])
}

export async function setPasswordHash(userId: string, hash: string): Promise<void> {
  await sql`
    UPDATE user_credentials
    SET password_hash = ${hash},
        reset_token_hash = NULL,
        reset_expires_at = NULL,
        token_version = token_version + 1
    WHERE user_id = ${userId}
  `
}

export async function incrementTokenVersion(userId: string): Promise<number> {
  const rows = await sql`
    UPDATE user_credentials
    SET token_version = token_version + 1
    WHERE user_id = ${userId}
    RETURNING token_version
  `
  return rows[0].token_version as number
}

export async function getTokenVersion(userId: string): Promise<number | null> {
  const rows = await sql`
    SELECT token_version FROM user_credentials WHERE user_id = ${userId} LIMIT 1
  `
  return rows[0] ? (rows[0].token_version as number) : null
}

export async function setInviteToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await sql`
    UPDATE user_credentials
    SET invite_token_hash = ${tokenHash},
        invite_expires_at = ${expiresAt},
        invite_accepted   = FALSE
    WHERE user_id = ${userId}
  `
}

export async function acceptInvite(userId: string, passwordHash: string): Promise<void> {
  await sql`
    UPDATE user_credentials
    SET invite_token_hash = NULL,
        invite_expires_at = NULL,
        invite_accepted   = TRUE,
        password_hash     = ${passwordHash},
        token_version     = token_version + 1
    WHERE user_id = ${userId}
  `
}

export async function findUserByInviteTokenHash(tokenHash: string): Promise<User | null> {
  const rows = await sql`
    SELECT u.*
    FROM users u
    JOIN user_credentials uc ON uc.user_id = u.id
    WHERE uc.invite_token_hash = ${tokenHash}
      AND uc.invite_expires_at > NOW()
      AND uc.invite_accepted = FALSE
    LIMIT 1
  `
  return rows[0] ? toUser(rows[0]) : null
}

export async function setResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await sql`
    UPDATE user_credentials
    SET reset_token_hash = ${tokenHash},
        reset_expires_at = ${expiresAt}
    WHERE user_id = ${userId}
  `
}

export async function findUserByResetTokenHash(tokenHash: string): Promise<User | null> {
  const rows = await sql`
    SELECT u.*
    FROM users u
    JOIN user_credentials uc ON uc.user_id = u.id
    WHERE uc.reset_token_hash = ${tokenHash}
      AND uc.reset_expires_at > NOW()
    LIMIT 1
  `
  return rows[0] ? toUser(rows[0]) : null
}

/** Count how many users exist (used by bootstrap script) */
export async function countUsers(): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int AS n FROM users`
  return rows[0].n as number
}
