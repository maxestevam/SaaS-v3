import { RequestError } from "./http.js";
export function apiErrorHandler(error, _req, res, next) {
  if (error instanceof RequestError) return res.status(error.status).json({ error: error.message, code: error.code });
  return next(error);
}
