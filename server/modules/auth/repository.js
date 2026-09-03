import { one, query } from "../../db.js";

export async function findUserByEmail(email) {
  return one(
    "SELECT id, name, email, password_hash, onboarding_completed_at FROM ld_users WHERE email = ?",
    [email],
  );
}

export async function findPasswordResetUserByEmail(email) {
  return one("SELECT id, name, email FROM ld_users WHERE email = ?", [email]);
}

export async function findUserSessionPolicy(userId) {
  return one("SELECT session_invalid_before FROM ld_users WHERE id = ?", [userId]);
}

export async function createUser(user) {
  await query(
    "INSERT INTO ld_users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [user.id, user.name, user.email, user.passwordHash, user.createdAt, user.updatedAt],
  );
}

export async function invalidateUnusedPasswordResets(userId, timestamp) {
  await query(
    "UPDATE ld_password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
    [timestamp, userId],
  );
}

export async function createPasswordResetToken(record) {
  await query(
    "INSERT INTO ld_password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    [record.id, record.userId, record.tokenHash, record.expiresAt, record.createdAt],
  );
}

export async function findActivePasswordReset(tokenHash, timestamp) {
  return one(
    "SELECT id, user_id FROM ld_password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
    [tokenHash, timestamp],
  );
}

export async function updateUserPassword(userId, passwordHash, timestamp) {
  await query(
    "UPDATE ld_users SET password_hash = ?, updated_at = ? WHERE id = ?",
    [passwordHash, timestamp, userId],
  );
}

export async function consumePasswordReset(id, timestamp) {
  await query("UPDATE ld_password_reset_tokens SET used_at = ? WHERE id = ?", [timestamp, id]);
}
