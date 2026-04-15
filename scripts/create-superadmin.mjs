/**
 * create-superadmin.mjs — crée un compte super_admin en base locale.
 * Usage : node scripts/create-superadmin.mjs <email> <password>
 * Ex    : node scripts/create-superadmin.mjs admin@lastwar.local MonMotDePasse123
 */
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const [,, email, password] = process.argv
if (!email || !password) {
  console.error('Usage: node scripts/create-superadmin.mjs <email> <password>')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Mot de passe trop court (min 8 caractères)')
  process.exit(1)
}

const envContent = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
const url = envContent.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim()
if (!url) { console.error('DATABASE_URL introuvable'); process.exit(1) }

const db = postgres(url, { max: 1 })

try {
  const hash = await bcrypt.hash(password, 12)
  const id   = randomUUID()

  await db.begin(async (tx) => {
    await tx`
      INSERT INTO users (id, email, name, role, is_active)
      VALUES (${id}, ${email.toLowerCase()}, 'Super Admin', 'super_admin', TRUE)
    `
    await tx`
      INSERT INTO user_credentials (user_id, password_hash, token_version, invite_accepted)
      VALUES (${id}, ${hash}, 1, TRUE)
    `
  })

  console.log(`✅ Compte créé : ${email} (super_admin)`)
  console.log(`   Mot de passe : ${password}`)
} catch (err) {
  if (err.code === '23505') {
    console.error(`❌ Un compte avec l'email "${email}" existe déjà.`)
  } else {
    console.error('❌ Erreur :', err.message)
  }
  process.exit(1)
} finally {
  await db.end()
}
