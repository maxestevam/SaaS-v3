export class MoneyError extends Error {
  constructor(message) { super(message); this.name = "MoneyError"; }
}

export function assertCents(value, label = "Valor") {
  if (!Number.isSafeInteger(value)) throw new MoneyError(`${label} deve ser um inteiro seguro em centavos.`);
  return value;
}

export function addCents(...values) { return values.reduce((total, value) => assertCents(total + assertCents(value)), 0); }
export function subtractCents(left, right) { return assertCents(assertCents(left) - assertCents(right)); }
export function multiplyCents(value, quantity) { if (!Number.isSafeInteger(quantity) || quantity < 0) throw new MoneyError("Quantidade inválida."); return assertCents(assertCents(value) * quantity); }
export function clampCents(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) { return Math.min(Math.max(assertCents(value), assertCents(minimum)), assertCents(maximum)); }

export function percentageToBasisPoints(value) {
  const source = String(value ?? "").trim().replace(",", ".");
  const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(source);
  if (!match) throw new MoneyError("Percentual inválido.");
  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number(match[2]);
  const fraction = Number((match[3] || "").padEnd(2, "0"));
  return assertCents(sign * (whole * 100 + fraction), "Percentual em pontos-base");
}

export function percentageOfCents(value, percentage) {
  const basisPoints = percentageToBasisPoints(percentage);
  if (basisPoints < 0) throw new MoneyError("Percentual não pode ser negativo.");
  return assertCents(Math.floor(assertCents(value) * basisPoints / 10_000));
}

export function formatCents(value, locale = "pt-BR", currency = "BRL") {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat(locale || "pt-BR", { style: "currency", currency: currency || "BRL" }).format(assertCents(value) / 100);
}
