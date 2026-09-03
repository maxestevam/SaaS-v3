export function normalizeIdentifier(value) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError("Identificador obrigatório ausente.");
  return normalized;
}

export function normalizeOptionalText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

export function normalizeSlug(value) {
  const source = normalizeOptionalText(value);
  return source ? source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : null;
}

export function decimalToCents(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).trim().replace(",", ".");
  const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new TypeError("Valor monetário inválido.");
  const sign = match[1] === "-" ? -1 : 1;
  const units = Number(match[2]);
  const decimals = Number((match[3] || "").padEnd(2, "0"));
  const cents = sign * (units * 100 + decimals);
  if (!Number.isSafeInteger(cents)) throw new TypeError("Valor monetário fora do limite seguro.");
  return cents;
}

export function centsToDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError("Valor em centavos inválido.");
  return Number((number / 100).toFixed(2));
}

export function isoToTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = Date.parse(String(value));
  if (!Number.isFinite(timestamp)) throw new TypeError("Data ISO inválida.");
  return timestamp;
}

export function timestampToIso(value) {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = Number(value);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new TypeError("Timestamp inválido.");
  return new Date(timestamp).toISOString();
}

export function normalizeEnum(value, allowed, label = "valor") {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value);
  if (!allowed.includes(normalized)) throw new TypeError(`${label} inválido.`);
  return normalized;
}

export function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeOptionalText).filter(Boolean))];
}

export function normalizeImageReferences(value) {
  return normalizeStringList(value).map((url, index) => ({ id: `media-${index + 1}`, kind: "image", url, sortOrder: index, isPrimary: index === 0 }));
}
