export function digits(value, max = Infinity) { return String(value || "").replace(/\D/g, "").slice(0, max); }

export function formatCpf(value) {
  const source = digits(value, 11);
  return source.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatPhone(value) {
  const source = digits(value, 11);
  if (source.length <= 10) return source.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return source.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function formatCep(value) {
  return digits(value, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatCurrencyInput(value) {
  const cents = Number(digits(value, 12) || 0);
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function currencyInputToCents(value) { return Number(digits(value, 12) || 0); }

export function centsToCurrencyInput(value) { return formatCurrencyInput(String(Math.max(0, Number(value || 0)))); }
