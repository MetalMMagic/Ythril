/** Typed error classes for structured error handling across the codebase. */

/** Thrown when a requested resource does not exist. */
export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';
  constructor(message: string) {
    super(message);
  }
}

/** Thrown when a request is invalid (bad params, missing fields, etc.). */
export class ValidationError extends Error {
  override readonly name = 'ValidationError';
  constructor(message: string) {
    super(message);
  }
}
