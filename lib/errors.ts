/**
 * Centralized error classes for the application.
 *
 * Design principles:
 * - All thrown errors extend AppError for consistent handling.
 * - Each error exposes a machine-readable `code`.
 * - Internal details stay server-side in production.
 * - `fail()` in apiResponse.ts converts these errors into API responses.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

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

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message: string = 'You do not have permission to perform this action',
  ) {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: number | string) {
    const message =
      id !== undefined
        ? `${resource} with id "${id}" not found`
        : `${resource} not found`
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'UNPROCESSABLE', 422, details)
    this.name = 'UnprocessableError'
  }
}

export class LockedError extends AppError {
  constructor(resource: string) {
    super(`${resource} is locked and cannot be modified`, 'LOCKED', 423)
    this.name = 'LockedError'
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = 'The service is temporarily unavailable. Please try again later.',
    details?: unknown,
  ) {
    super(message, 'SERVICE_UNAVAILABLE', 503, details)
    this.name = 'ServiceUnavailableError'
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
