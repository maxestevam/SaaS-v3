export const BRAZILIAN_STATES = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"],
].map(([value, label]) => ({ value, label }));

export const BRAZILIAN_STATE_CODES = new Set(BRAZILIAN_STATES.map((state) => state.value));

export function cepDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

export async function lookupBrazilianAddress(cep, { signal } = {}) {
  const normalizedCep = cepDigits(cep);
  if (normalizedCep.length !== 8) throw new Error("Informe os oito dígitos do CEP.");

  const response = await api.lookupBrazilianAddress(normalizedCep, { signal });
  return response.address;
}
import { api } from "@/lib/api";
