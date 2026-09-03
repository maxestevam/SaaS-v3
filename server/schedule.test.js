import { describe, expect, it } from "vitest";
import { billingLifecycle } from "./api.js";
import { isAuthorizedCron } from "./schedule-auth.ts";

describe("autorização do reconciliador agendado", () => {
  it("aceita exclusivamente atores de cron com taskUid emitido pela plataforma", () => {
    expect(isAuthorizedCron({ isCron: true, taskUid: "task_billing_reconciliation" })).toBe(true);
    expect(isAuthorizedCron({ isCron: true })).toBe(false);
    expect(isAuthorizedCron({ taskUid: "task_billing_reconciliation" })).toBe(false);
    expect(isAuthorizedCron(null)).toBe(false);
  });
});

describe("ciclo de inadimplência", () => {
  it("não alerta antes de três dias, alerta no terceiro e inativa a partir do décimo quinto", () => {
    expect(billingLifecycle(2)).toMatchObject({ kind: "grace", storeStatus: null });
    expect(billingLifecycle(3)).toEqual({ kind: "overdue", storeStatus: 4, daysUntilInactivation: 12 });
    expect(billingLifecycle(14)).toEqual({ kind: "overdue", storeStatus: 4, daysUntilInactivation: 1 });
    expect(billingLifecycle(15)).toEqual({ kind: "inactive", storeStatus: 0, daysUntilInactivation: 0 });
  });
});
