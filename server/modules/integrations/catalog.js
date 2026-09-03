const paymentTypeLabels = {
  account_money: "Saldo Mercado Pago",
  bank_transfer: "Transferência bancária",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  digital_currency: "Carteira digital",
  prepaid_card: "Cartão pré-pago",
  ticket: "Boleto e pagamento em dinheiro",
};

const shippingTypeLabels = {
  normal: "Entrega padrão",
  express: "Entrega expressa",
};

export function sanitizeMercadoPagoMethods(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((method) => method?.status === "active" && safeId(method.id) && safeText(method.name))
    .map((method) => ({
      id: `mercado_pago:${safeId(method.id)}`,
      provider: "mercado_pago",
      providerMethodId: safeId(method.id),
      name: safeText(method.name),
      description: paymentTypeLabels[safeId(method.payment_type_id)] || "Meio disponível no Mercado Pago",
      type: safeId(method.payment_type_id),
    }))
    .slice(0, 80);
}

export function sanitizeMelhorEnvioServices(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((service) => Number.isInteger(Number(service?.id)) && safeText(service?.name))
    .map((service) => {
      const company = safeText(service.company?.name || service.company_name);
      const type = safeId(service.type);
      return {
        id: `melhor_envio:${Number(service.id)}`,
        provider: "melhor_envio",
        providerServiceId: Number(service.id),
        name: [company, safeText(service.name)].filter(Boolean).join(" · "),
        description: shippingTypeLabels[type] || "Serviço disponível no Melhor Envio",
        type,
      };
    })
    .slice(0, 80);
}

export function selectionFromProviderOption(option, current = {}) {
  return {
    id: option.id,
    provider: option.provider,
    providerMethodId: option.providerMethodId,
    providerServiceId: option.providerServiceId,
    name: option.name,
    description: option.description,
    type: option.type,
    enabled: current?.enabled !== false,
  };
}

function safeId(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_:-]/g, "").slice(0, 80);
}

function safeText(value) {
  return String(value || "").replace(/[<>\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}
