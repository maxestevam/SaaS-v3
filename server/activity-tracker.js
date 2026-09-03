import { randomUUID } from "node:crypto";

function cleanRoute(value) {
  return String(value || "").slice(0, 255);
}

export function createActivityTracker({ query }) {
  return async (req, _res, next) => {
    try {
      const now = Date.now();
      await query(
        "INSERT INTO ld_user_presence (user_id, last_seen_at, last_route, last_action, updated_at) VALUES (?, ?, ?, 'api_request', ?) ON DUPLICATE KEY UPDATE last_seen_at = VALUES(last_seen_at), last_route = VALUES(last_route), last_action = VALUES(last_action), updated_at = VALUES(updated_at)",
        [req.user.id, now, cleanRoute(req.path), now],
      );
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        await query(
          "INSERT INTO ld_user_activity_log (id, user_id, store_id, event_type, route, metadata_json, created_at) VALUES (?, ?, NULL, ?, ?, NULL, ?)",
          [randomUUID(), req.user.id, `api_${req.method.toLowerCase()}`, cleanRoute(req.path), now],
        );
      }
    } catch (error) {
      console.warn("[Presence] Não foi possível atualizar a presença", error);
    }
    next();
  };
}
