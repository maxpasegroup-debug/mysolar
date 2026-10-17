export class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const badInput = (message = 'Please check the supplied details.') => new HttpError(400, 'VALIDATION_ERROR', message);
// Fixed categories only: never log database messages, SQL, submitted data or credentials.
const diagnosticCauses = Object.freeze({
  '42P01':'DATABASE_SCHEMA_MISSING', '42703':'DATABASE_SCHEMA_OUTDATED',
  'ECONNREFUSED':'DATABASE_CONNECTION_REFUSED', 'ETIMEDOUT':'DEPENDENCY_TIMEOUT',
  '28P01':'DATABASE_AUTHENTICATION_FAILED', '53300':'DATABASE_CONNECTION_LIMIT',
  '57P01':'DATABASE_RESTARTING'
});
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error instanceof HttpError ? error.status : 500;
  let code = error instanceof HttpError ? error.code : 'SERVER_ERROR';
  let message = error instanceof HttpError ? error.message : 'This request could not be completed. Please try again.';
  if (error.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; message = 'Please send valid JSON.'; }
  if (error.type === 'entity.too.large') { status = 413; code = 'REQUEST_TOO_LARGE'; message = 'This request is too large.'; }
  if (error.code === '23505') { status = 409; code = 'CONFLICT'; message = 'These details could not be saved. Please check them or sign in to your existing account.'; }
  if (['42P01','42703'].includes(error.code)) { status = 503; code = 'SERVICE_NOT_READY'; message = 'The service is being set up. Please try again shortly or contact support.'; }
  if (status >= 500) console.error(JSON.stringify({ event: 'request_error', requestId: req.requestId, code: 'INTERNAL_ERROR', cause: diagnosticCauses[error.code] || 'UNEXPECTED_ERROR' }));
  res.status(status).json({ error: { code, message, requestId: req.requestId } });
}
