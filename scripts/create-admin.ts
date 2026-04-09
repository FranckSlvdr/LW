#!/usr/bin/env tsx
/**
 * Bootstrap script — creates the first super_admin user.
 *
 * Usage:
 *   npm run db:create-admin
 *
 * Behaviour:
 *   - Refuses to run if a super_admin already exists
 *   - Prompts for email, name, and password interactively
 *   - Validates password length (min 12 chars)
 *   - Creates user + credentials + marks invite as accepted
 *
 * Env:
 *   DATABASE_URL   required  (reads from .env.local)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import * as readline from 'readline'

// Load environment before anything else
config({ path: resolve(process.cwd(), '.env.local') })

// Dynamic imports after env is loaded
async function main() {
  const bcrypt     = await import('bcryptjs')
  const postgres   = await import('postgres')

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('[create-admin] ERROR: DATABASE_URL is not set.')
    process.exit(1)
  }

  const sql = postgres.default(dbUrl, { max: 1 })

  try {
    // Check if any super_admin already exists
    const existing = await sql`
      SELECT COUNT(*)::int AS n FROM users WHERE role = 'super_admin'
    `
    if (existing[0].n > 0) {
      console.error('[create-admin] A super_admin already exists. Aborting.')
      console.error('To manage users, use the admin interface at /admin/users.')
      await sql.end()
      process.exit(1)
    }

    // Interactive prompts
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const prompt = (q: string): Promise<string> =>
      new Promise((resolve) => rl.question(q, resolve))

    console.log('\n─── Last War Tracker — Create Super Admin ───\n')

    const email = (await prompt('Email: ')).trim().toLowerCase()
    if (!email.includes('@')) {
      console.error('Invalid email.')
      rl.close()
      await sql.end()
      process.exit(1)
    }

    const name = (await prompt('Name: ')).trim()
    if (!name) {
      console.error('Name cannot be empty.')
      rl.close()
      await sql.end()
      process.exit(1)
    }

    // Read password without echoing (Unix-only: switch to raw mode)
    process.stdout.write('Password (min 12 chars): ')
    const password = await new Promise<string>((resolve) => {
      let input = ''
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true)
        process.stdin.resume()
        process.stdin.setEncoding('utf8')
        process.stdin.on('data', function handler(ch: string) {
          if (ch === '\r' || ch === '\n') {
            process.stdin.setRawMode(false)
            process.stdin.pause()
            process.stdin.removeListener('data', handler)
            process.stdout.write('\n')
            resolve(input)
          } else if (ch === '\u0003') {
            process.exit(0)
          } else if (ch === '\u007F') {
            input = input.slice(0, -1)
          } else {
            input += ch
          }
        })
      } else {
        // Non-TTY (piped input)
        rl.question('', resolve)
      }
    })

    rl.close()

    if (password.length < 12) {
      console.error('Password must be at least 12 characters.')
      await sql.end()
      process.exit(1)
    }

    const hash = await bcrypt.default.hash(password, 12)

    // Insert user + credentials in a transaction
    await sql.begin(async (tx) => {
      const [user] = await tx`
        INSERT INTO users (email, name, role)
        VALUES (${email}, ${name}, 'super_admin')
        RETURNING id
      `
      await tx`
        INSERT INTO user_credentials (user_id, password_hash, invite_accepted)
        VALUES (${user.id}, ${hash}, TRUE)
      `
    })

    console.log(`\n[create-admin] Super admin created successfully.`)
    console.log(`  Email: ${email}`)
    console.log(`  Name:  ${name}`)
    console.log(`\nYou can now log in at /login\n`)
  } catch (err) {
    console.error('[create-admin] ERROR:', err)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
