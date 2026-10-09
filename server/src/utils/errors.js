export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', issues = undefined, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    if (issues !== undefined) {
      this.issues = issues;
    }
    if (details !== undefined) {
      this.details = details;
    }
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
