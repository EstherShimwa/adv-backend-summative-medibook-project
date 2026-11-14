// An expected, client-facing error. The central error handler turns it into JSON.
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (details !== undefined) this.details = details;
  }
}

module.exports = AppError;
