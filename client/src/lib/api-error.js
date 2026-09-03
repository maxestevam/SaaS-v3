const DEFAULT_MESSAGES = {
  400: "A solicitação contém dados inválidos.",
  401: "Sua sessão expirou. Entre novamente para continuar.",
  403: "Você não tem permissão para concluir esta ação.",
  404: "O recurso solicitado não foi encontrado.",
  409: "Não foi possível concluir a ação devido a um conflito de dados.",
  413: "O arquivo ou conteúdo enviado excede o tamanho permitido.",
  422: "Revise os dados informados e tente novamente.",
  429: "Muitas tentativas em pouco tempo. Aguarde e tente novamente.",
  500: "O serviço encontrou um problema. Tente novamente em instantes.",
  503: "O serviço está temporariamente indisponível.",
};

export class ApiError extends Error {
  constructor({ status = 0, code = null, message, path = null, cause = null } = {}) {
    super(message || DEFAULT_MESSAGES[status] || "Não foi possível concluir esta ação.");
    this.name = "ApiError";
    this.status = Number.isInteger(status) ? status : 0;
    this.code = code || null;
    this.path = path || null;
    this.cause = cause || null;
    this.retryable = this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export function apiErrorFromResponse(response, body, path) {
  return new ApiError({
    status: response.status,
    code: body?.code || null,
    message: body?.error || body?.message || DEFAULT_MESSAGES[response.status],
    path,
  });
}

export function apiUnavailableError(path, cause) {
  return new ApiError({ status: 0, path, cause, message: "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente." });
}

export function isApiError(error, status = null) {
  return error instanceof ApiError && (status === null || error.status === status);
}

export function errorMessage(error, fallback = "Não foi possível concluir esta ação.") {
  if (error instanceof ApiError) return error.message || fallback;
  return error?.message || fallback;
}
