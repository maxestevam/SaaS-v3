import { describe, expect, it } from "vitest";
import { boundedPagination, enforceRateLimit, enforceRequestLimits, RequestError } from "./modules/shared/http.js";

function response() { const headers = new Map(); return { headers, setHeader(key, value) { headers.set(key, value); } }; }
function runLimits(req) { let nextError; enforceRequestLimits(req, response(), (error) => { nextError = error; }); return nextError; }

describe("limites compartilhados de requisição", () => {
  it("rejeita parâmetros de rota inválidos e corpos excessivos", () => {
    expect(runLimits({ method: "GET", query: {}, params: { storeId: "../segredo" }, is: () => false })).toBeInstanceOf(RequestError);
    expect(runLimits({ method: "POST", query: {}, params: {}, is: () => true, body: Array.from({ length: 101 }, () => "x") })).toBeInstanceOf(RequestError);
  });
  it("rejeita query strings excessivas e objetos JSON profundamente aninhados", () => {
    const query = Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`filter${index}`, "x"]));
    expect(runLimits({ method: "GET", query, params: {}, is: () => false })).toMatchObject({ status: 422 });
    const nested = { one: { two: { three: { four: { five: { six: { seven: "x" } } } } } } };
    expect(runLimits({ method: "PATCH", query: {}, params: {}, is: () => true, body: nested })).toMatchObject({ status: 422 });
  });
  it("limita paginação a valores inteiros e uma faixa explícita", () => {
    expect(boundedPagination({ page: "2", limit: "50" })).toEqual({ page: 2, limit: 50, offset: 50 });
    expect(() => boundedPagination({ page: "0" })).toThrow(RequestError);
    expect(() => boundedPagination({ limit: "101" }, { maxLimit: 100 })).toThrow(RequestError);
  });
  it("aplica uma janela de taxa por cliente e caminho", () => {
    const req = { ip: "rate-limit-test", path: "/auth/login" }; let error;
    for (let index = 0; index < 21; index += 1) enforceRateLimit(req, response(), (nextError) => { error = nextError; });
    expect(error).toBeInstanceOf(RequestError);
    expect(error.status).toBe(429);
  });
});
