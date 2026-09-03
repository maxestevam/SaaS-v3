import { describe, expect, it } from "vitest";
import { ApiError, apiUnavailableError, errorMessage, isApiError } from "./api-error";

describe("erros da fronteira HTTP", () => {
  it("preserva status, código e possibilidade de repetição", () => {
    const error = new ApiError({ status: 422, code: "INVALID_INPUT", message: "Campo inválido." });
    expect(error).toMatchObject({ name: "ApiError", status: 422, code: "INVALID_INPUT", retryable: false });
    expect(isApiError(error, 422)).toBe(true);
    expect(errorMessage(error)).toBe("Campo inválido.");
  });

  it("classifica falha de rede como indisponibilidade repetível", () => {
    const error = apiUnavailableError("/v1/public/stores/store-a/contract", new TypeError("Failed to fetch"));
    expect(error).toMatchObject({ status: 0, retryable: true });
    expect(error.message).toMatch(/conectar ao serviço/i);
  });
});
