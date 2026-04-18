import 'server-only'

// The current unstable_cache usage is fine locally, but on Vercel the hosted
// runtime has shown requests continuing in the background until timeout. For
// critical user-facing reads we prefer direct DB/snapshot access there.
export const IS_VERCEL_RUNTIME = Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
export const USE_NEXT_DATA_CACHE = !IS_VERCEL_RUNTIME
