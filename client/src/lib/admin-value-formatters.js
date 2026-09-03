import { formatCents } from "../../../shared/store-contract/money.js";
import { isoToTimestamp } from "../../../shared/store-contract/normalizers.js";

export function formatAdminCurrency(cents, locale = "pt-BR", currency = "BRL") {
  try {
    return formatCents(Number(cents), locale, currency) || "—";
  } catch {
    return "—";
  }
}

export function normalizeDisplayTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  if (Number.isSafeInteger(Number(value)) && Number(value) > 0) return Number(value);
  try {
    return isoToTimestamp(value);
  } catch {
    return null;
  }
}

export function formatAdminDate(value, locale = "pt-BR") {
  const timestamp = normalizeDisplayTimestamp(value);
  return timestamp ? new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(timestamp) : "—";
}

export function dateInputToTimestamp(value, endOfDay = false) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? timestamp : null;
}

export function dateRangeFromInputs({ dateFrom, dateTo } = {}) {
  return {
    dateFrom: dateFrom ? dateInputToTimestamp(dateFrom) : undefined,
    dateTo: dateTo ? dateInputToTimestamp(dateTo, true) : undefined,
  };
}

export function timestampToLocalDateTimeInput(value) {
  const timestamp = normalizeDisplayTimestamp(value);
  if (!timestamp) return "";
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
