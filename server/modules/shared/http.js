export class RequestError extends Error { constructor(status, message, code = null) { super(message); this.name = "RequestError"; this.status = status; this.code = code; } }
export function enforceRateLimit(_req, _res, next) { next(); }
export function enforceRequestLimits(_req, _res, next) { next(); }
export function boundedPagination(query = {}) { const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20)); return { page, limit, offset: (page - 1) * limit }; }
