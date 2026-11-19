/**
 * Every API error uses one shape: { "error": { "code", "message" } }.
 * Validation errors add `fields`: { fieldName: fieldErrorCode } so the
 * frontend can show a translated message next to each field.
 */
export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const badRequest = (message, fields) =>
  new HttpError(400, 'VALIDATION', message, fields ? { fields } : {});
export const unauthorized = () => new HttpError(401, 'UNAUTHORIZED', 'Please sign in');
export const forbidden = (message = 'You are not allowed to do this') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Resource') => new HttpError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (code, message, extra) => new HttpError(409, code, message, extra);

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  }
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Request body is too large' } });
  }
  // multer errors (file too large, too many files…)
  if (err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 10 MB or smaller'
      : err.code === 'LIMIT_FILE_COUNT' ? 'A product can have at most 5 images'
      : 'Upload rejected';
    return res.status(400).json({ error: { code: `UPLOAD_${err.code}`, message } });
  }
  // e.g. a missing file under /uploads from express.static
  if (err.status === 404) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong' } });
}
