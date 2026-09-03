/** Loja Descomplicada: o retorno do pagamento apresenta um estado claro antes da entrada no aplicativo. */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, CircleAlert, LoaderCircle, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { persistActiveStore } from "@/lib/active-store-cache";
import { routeIdentifier, routeQueryValue } from "@/lib/route-params";
import { useI18n } from "@/i18n";

export default function BillingReturnPage() {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const storeId = routeIdentifier(routeQueryValue(window.location.search, "store_id", 160));
  const [state, setState] = useState("checking");

  useEffect(() => {
    if (!storeId) return setState("error");
    let retries = 0;
    const check = async () => {
      try {
        const result = await api.getSubscription(storeId);
        if (["authorized", "active", "pending", "trial"].includes(result.subscription?.status)) {
          persistActiveStore(result.store);
          setState("success");
          return;
        }
        if (retries < 4) { retries += 1; setTimeout(check, 1800); } else setState("pending");
      } catch { setState("error"); }
    };
    check();
    return () => { retries = 5; };
  }, [storeId]);

  const content = {
    checking: { icon: <LoaderCircle className="size-8 animate-spin text-primary" />, title: t("billingReturn.checkingTitle"), body: t("billingReturn.checkingBody") },
    success: { icon: <CheckCircle2 className="size-8 text-sage" />, title: t("billingReturn.successTitle"), body: t("billingReturn.successBody") },
    pending: { icon: <LoaderCircle className="size-8 animate-spin text-marigold" />, title: t("billingReturn.pendingTitle"), body: t("billingReturn.pendingBody") },
    error: { icon: <CircleAlert className="size-8 text-primary" />, title: t("billingReturn.errorTitle"), body: t("billingReturn.errorBody") },
  }[state];

  return <div className="flex min-h-screen flex-col bg-cream px-5 py-6 sm:px-10"><BrandMark /><main className="mx-auto flex w-full max-w-[540px] flex-1 items-center justify-center"><div className="w-full rounded-[18px] border border-ink/10 bg-card p-8 text-center shadow-[0_24px_60px_rgba(23,43,58,.08)] sm:p-10"><div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-secondary">{content.icon}</div><h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-.045em] text-ink">{content.title}</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">{content.body}</p>{state === "success" || state === "pending" ? <Button size="lg" className="mt-8" onClick={() => navigate("/dashboard")}>{t("billingReturn.enterDashboard")} <ArrowRight className="size-4" /></Button> : state === "error" ? <Link href="/onboarding/plan" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_8px_18px_rgba(255,100,79,.18)] transition-transform duration-150 active:scale-[.97]">{t("billingReturn.viewPlans")} <ArrowRight className="size-4" /></Link> : null}</div></main></div>;
}
