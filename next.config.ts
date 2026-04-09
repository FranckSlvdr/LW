import type { NextConfig } from 'next'

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
// CSP notes:
//   - style-src 'unsafe-inline' required: Tailwind v4 injects <style> blocks
//   - script-src 'unsafe-inline' required: Next.js App Router inlines hydration
//   - script-src 'unsafe-eval' required in dev: React uses eval() for call stack
//     reconstruction and Turbopack HMR. Never included in production builds.
//   - font-src 'self': next/font/google downloads at build time, serves locally
//   - connect-src 'self': all API calls are same-origin
//   Nonce-based CSP (removing unsafe-inline) is a future hardening step.
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV === 'development'

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Prevent clickjacking — also enforced via CSP frame-ancestors below
  { key: 'X-Frame-Options', value: 'DENY' },

  // Restrict referrer info sent to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Disable browser features the app does not use
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },

  // Force HTTPS for 1 year (Vercel serves HTTPS only)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },

  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js App Router requires unsafe-inline for hydration scripts.
      // Dev only: unsafe-eval is required by React (call stack reconstruction) and Turbopack HMR.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      // Tailwind v4 + CSS custom properties require unsafe-inline
      "style-src 'self' 'unsafe-inline'",
      // next/font serves fonts locally after build-time download
      "font-src 'self'",
      // Images: self + data URIs (no external image sources currently)
      "img-src 'self' data: blob:",
      // All fetch/XHR must go to same origin
      "connect-src 'self'",
      // No workers, plugins, or frames
      "worker-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
