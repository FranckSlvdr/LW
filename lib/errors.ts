/**
 * Centralized error classes for the application.
 *
 * Design principles:
 * - All thrown errors extend AppError to ensure consistent handling
 * - Each error carries a machine-readable `code` (used in API responses)
 * - Technical details are never surfaced to the client in production
 * - The `fail()` helper in apiResponse.ts consumes these classes
 */

// ─── Base ───────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    /** Only logged server-side, never sent to client in production */
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    // Maintain proper prototype chain in transpiled JS
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ─── HTTP 400 ────────────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 'BAD_REQUEST', 400)
    this.name = 'BadRequestError'
  }
}

// ─── HTTP 401 ────────────────────────────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

// ─── HTTP 403 ────────────────────────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

// ─── HTTP 404 ────────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource: string, id?: number | string) {
    const message = id !== undefined
      ? `${resource} with id "${id}" not found`
      : `${resource} not found`
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

// ─── HTTP 409 ────────────────────────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

// ─── HTTP 422 ────────────────────────────────────────────────────────────────

export class UnprocessableError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'UNPROCESSABLE', 422, details)
    this.name = 'UnprocessableError'
  }
}

// ─── HTTP 423 ────────────────────────────────────────────────────────────────

export class LockedError extends AppError {
  constructor(resource: string) {
    super(`${resource} is locked and cannot be modified`, 'LOCKED', 423)
    this.name = 'LockedError'
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Wraps an unknown caught value into a readable message for logging.
 * Never use this to build API responses — use isAppError + fail() instead.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
