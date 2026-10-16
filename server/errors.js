export class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const badInput = (message = 'Please check the supplied details.') => new HttpError(400, 'VALIDATION_ERROR', message);
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error instanceof HttpError ? error.status : 500;
  let code = error instanceof HttpError ? error.code : 'SERVER_ERROR';
  let message = error instanceof HttpError ? error.message : 'This request could not be completed. Please try again.';
  if (error.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; message = 'Please send valid JSON.'; }
  if (error.type === 'entity.too.large') { status = 413; code = 'REQUEST_TOO_LARGE'; message = 'This request is too large.'; }
  if (error.code === '23505') { status = 409; code = 'CONFLICT'; message = 'These details could not be saved. Please check them or sign in to your existing account.'; }
  if (status === 500) console.error(JSON.stringify({ event: 'request_error', requestId: req.requestId, code: 'INTERNAL_ERROR' }));
  res.status(status).json({ error: { code, message, requestId: req.requestId } });
}
