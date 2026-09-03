import { describe, expect, it, vi } from "vitest";
import { getStorePlanUsage, maxNewMedia, normalizePlanLimits, quotaFor, requirePlanQuota } from "./plan-limits.js";

const domainError = (status, message) => Object.assign(new Error(message), { status });

describe("limites de plano", () => {
  it("normaliza limite zero como ilimitado até o teto configurado", () => {
    const limits = normalizePlanLimits({ products: 0, customers: 25, unlimitedCap: 180 });
    expect(limits).toMatchObject({ products: 0, customers: 25, unlimitedCap: 180 });
    expect(quotaFor(limits, "products")).toBe(180);
    expect(quotaFor(limits, "customers")).toBe(25);
  });

  it("rejeita limites e tetos fora da faixa operacional segura", () => {
    expect(() => normalizePlanLimits({ products: 1001 })).toThrow("produtos cadastrados entre 0 e 1000");
    expect(() => normalizePlanLimits({ unlimitedCap: 0 })).toThrow("teto de ilimitado entre 1 e 1000");
  });

  it("bloqueia a criação ao atingir o teto efetivo de um limite ilimitado", async () => {
    const one = vi.fn()
      .mockResolvedValueOnce({ subscription_id: "sub-1", plan_id: "plan-1", plan_name: "Profissional", products_limit: 0, unlimited_cap: 2 })
      .mockResolvedValueOnce({ total: 2 });
    const operation = requirePlanQuota({ storeId: "store-1", field: "products", countSql: "SELECT total", one, createError: domainError });
    await expect(operation).rejects.toMatchObject({ status: 409 });
    await expect(operation).rejects.toThrow("limite de 2 produtos cadastrados");
  });

  it("aceita mídia dentro da quota e bloqueia apenas o excedente", () => {
    const limits = normalizePlanLimits({ productImages: 3, unlimitedCap: 1000 });
    expect(maxNewMedia({ limits, field: "productImages", existing: 2, incoming: 1, createError: domainError })).toBe(3);
    expect(() => maxNewMedia({ limits, field: "productImages", existing: 2, incoming: 2, createError: domainError })).toThrow("limite de 3 fotos por produto");
  });

  it("consolida o consumo de catálogo e o maior uso de mídia por entidade", async () => {
    const one = vi.fn().mockResolvedValueOnce({ total: 3 }).mockResolvedValueOnce({ total: 2 }).mockResolvedValueOnce({ total: 1 }).mockResolvedValueOnce({ total: 10 }).mockResolvedValueOnce({ total: 4 }).mockResolvedValueOnce({ total: 2 }).mockResolvedValueOnce({ total: 5 }).mockResolvedValueOnce({ total: 1 }).mockResolvedValueOnce({ total: 3 });
    await expect(getStorePlanUsage({ storeId: "store-1", one })).resolves.toEqual({ products: 3, categories: 2, subcategories: 1, customers: 10, coupons: 4, banners: 2, productImages: 5, productVideos: 1, bannerImages: 3 });
  });
});
