import { randomUUID } from "node:crypto";
import { createResetToken, hashToken, hashPassword, signSession, verifyPassword } from "../../auth.js";
import { publicUser } from "../shared/presenters.js";
import {
  consumePasswordReset,
  createPasswordResetToken,
  createUser,
  findActivePasswordReset,
  findPasswordResetUserByEmail,
  findUserByEmail,
  findUserSessionPolicy,
  invalidateUnusedPasswordResets,
  updateUserPassword,
} from "./repository.js";
import { normalizeEmail } from "./validation.js";
import { sendResetEmail } from "./email.js";

export class AuthDomainError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function registerAccount(input) {
  if (await findUserByEmail(input.email)) {
    throw new AuthDomainError(409, "Já existe uma conta com este e-mail.");
  }

  const timestamp = Date.now();
  const user = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await createUser(user);
  return sessionPayload(user);
}

export async function loginAccount(input) {
  const user = await findUserByEmail(input.email);
  if (!user || !(await verifyPassword(input.password, user.password_hash))) {
    throw new AuthDomainError(401, "E-mail ou senha inválidos.");
  }
  return sessionPayload(user);
}

export async function requestPasswordReset(email, origin) {
  const user = await findPasswordResetUserByEmail(email);
  if (!user) return;

  const timestamp = Date.now();
  const rawToken = createResetToken();
  await invalidateUnusedPasswordResets(user.id, timestamp);
  await createPasswordResetToken({
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: timestamp + 30 * 60 * 1000,
    createdAt: timestamp,
  });
  await sendResetEmail(user, rawToken, origin);
}

export async function resetPassword(input) {
  const timestamp = Date.now();
  const token = await findActivePasswordReset(hashToken(input.token), timestamp);
  if (!token) {
    throw new AuthDomainError(400, "Este link expirou ou já foi utilizado.");
  }

  await updateUserPassword(token.user_id, await hashPassword(input.password), timestamp);
  await consumePasswordReset(token.id, timestamp);
}

export async function isSessionValid(user) {
  const account = await findUserSessionPolicy(user.id);
  return Boolean(account && (!account.session_invalid_before || user.issuedAt > Number(account.session_invalid_before)));
}

async function sessionPayload(user) {
  return {
    token: await signSession(user, process.env.JWT_SECRET),
    user: publicUser(user),
  };
}

export { normalizeEmail };
