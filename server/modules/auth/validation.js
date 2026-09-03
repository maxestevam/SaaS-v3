import { validText } from "../shared/validation.js";

export class AuthValidationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function parseRegistration(source = {}) {
  const name = validText(source.name, 2, 120);
  const email = normalizeEmail(source.email);
  const password = String(source.password || "");
  if (!name || !email || password.length < 8) {
    throw new AuthValidationError(422, "Informe nome, e-mail válido e senha com ao menos 8 caracteres.");
  }
  return { name, email, password };
}

export function parseLogin(source = {}) {
  const email = normalizeEmail(source.email);
  const password = String(source.password || "");
  if (!email || !password) {
    throw new AuthValidationError(401, "E-mail ou senha inválidos.");
  }
  return { email, password };
}

export function parsePasswordReset(source = {}) {
  const token = String(source.token || "");
  const password = String(source.password || "");
  if (!token || password.length < 8) {
    throw new AuthValidationError(422, "Link ou senha inválidos.");
  }
  return { token, password };
}

export function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
