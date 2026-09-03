/** Loja Descomplicada: planos de teste simples e visual mobile para ativar a operação sem fricção. */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Check, CreditCard, Gift, LoaderCircle, Package, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ProgressSteps } from "@/components/ProgressSteps";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TransparentPaymentDrawer } from "@/components/billing/TransparentPaymentDrawer";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { persistActiveStore, readActiveStoreCache } from "@/lib/active-store-cache";
import { formatAdminCurrency } from "@/lib/admin-value-formatters";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

const limitLabels = [["products", "produtos"], ["categories", "categorias"], ["subcategories", "subcategorias"], ["customers", "clientes"], ["coupons", "cupons"], ["banners", "banners"], ["productImages", "fotos por produto"], ["productVideos", "vídeos por produto"], ["bannerImages", "fotos por banner"]];
const limitFeatureList = (plan) => { const limits = plan?.limits || {}; const cap = Number(limits.unlimitedCap || 1000); return limitLabels.map(([key, label]) => Number(limits[key] || 0) === 0 ? `Até ${cap} ${label}` : `Até ${limits[key]} ${label}`).filter((item, index, items) => items.indexOf(item) === index); };

export default function PlanOnboardingPage() {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const [store, setStore] = useState(() => readActiveStoreCache());
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [trialDays, setTrialDays] = useState(7);
  const chosen = plans.find((plan) => plan.id === selected);

  useEffect(() => { api.getPlans().then((result) => { const availablePlans = result.plans || []; setPlans(availablePlans); setSelected((current) => availablePlans.some((plan) => plan.id === current) ? current : availablePlans[0]?.id || ""); }).catch((error) => toast.error(error.message)); }, []);

  useEffect(() => {
    api.getDashboard().then((result) => {
      setTrialDays(Number(result.trialDays || 7));
      if (store?.id) return;
      const persistedStore = result.stores?.[0] || null;
      if (!persistedStore) return;
      setStore(persistedStore);
      if (persistedStore.subscription?.planId) setSelected(persistedStore.subscription.planId);
      persistActiveStore(persistedStore);
    }).catch(() => undefined);
  }, [store?.id]);

  async function handleCheckout() {
    if (!store?.id) return toast.error(t("plan.storeMissing"));
    setPending(true);
    try {
      const result = await api.startCheckout({ storeId: store.id, planId: selected });
      setCheckoutOrder({ ...result.order, storeName: store.name });
      setPending(false);
    } catch (error) { toast.error(error.message); setPending(false); }
  }

  async function handleTrial() {
    if (!store?.id) return toast.error(t("plan.storeMissing"));
    setPending(true);
    try {
      await api.startTrial({ storeId: store.id, planId: selected });
      toast.success(t("plan.trialStarted"));
      navigate("/dashboard");
    } catch (error) { toast.error(error.message); } finally { setPending(false); }
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="flex h-[74px] items-center justify-between border-b border-ink/10 px-5 sm:px-10"><BrandMark /><ProgressSteps active={2} /></header>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-10 lg:py-16"><div className="max-w-2xl"><p className="mb-3 text-[10px] font-black uppercase tracking-[.18em] text-primary">{t("plan.step")}</p><h1 className="font-display text-4xl font-semibold leading-[1] tracking-[-.045em] text-ink sm:text-5xl">{t("plan.title")}</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">{t("plan.inviteTrial")} <strong className="font-bold text-ink">{trialDays} {trialDays === 1 ? t("plan.trialDaysOne") : t("plan.trialDaysMany")}</strong>. {t("plan.trialEnd")}</p></div>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">{plans.map((plan) => <button type="button" key={plan.id} onClick={() => setSelected(plan.id)} className={cn("relative text-left transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", selected === plan.id && "-translate-y-1")}><Card className={cn("h-full overflow-hidden border-2 transition-colors", selected === plan.id ? "border-ink" : "border-transparent")}><CardContent className="p-6 sm:p-7">{plan.featured && <span className="absolute right-5 top-0 rounded-b-[8px] bg-primary px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-primary-foreground">{t("plan.featured")}</span>}<div className="flex items-start justify-between gap-5"><div><span className="text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">{t("plan.planLabel")}</span><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.04em] text-ink">{plan.name}</h2><p className="mt-2 max-w-[280px] text-sm leading-5 text-muted-foreground">{plan.description}</p></div><span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border", selected === plan.id ? "border-ink bg-ink text-cream" : "border-border bg-background")}>{selected === plan.id && <Check className="size-3.5" />}</span></div><div className="my-7 h-px bg-ink/10" /><div className="flex items-end gap-1"><span className="font-display text-4xl font-semibold tracking-[-.05em] text-ink">{formatAdminCurrency(plan.amountCents)}</span><span className="mb-1.5 text-xs font-bold text-muted-foreground">{t("plan.perMonth")}</span></div><ul className="mt-6 space-y-3">{[...plan.features, ...limitFeatureList(plan)].map((feature) => <li key={feature} className="flex items-center gap-2 text-sm text-ink"><Check className="size-4 text-primary" />{feature}</li>)}</ul></CardContent></Card></button>)}</div>
        <div className="mt-7 flex flex-col items-start justify-between gap-5 border-t border-ink/10 pt-6"><div className="flex max-w-md gap-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-sage" />{t("plan.securePayment")}</div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Button variant="outline" size="lg" onClick={() => navigate("/products")} disabled={!store?.id}><Package className="size-4" />{t("plan.catalogNow")}</Button><Button variant="outline" size="lg" onClick={handleTrial} disabled={pending || !chosen}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <><Gift className="size-4" />{t("plan.startTrial")}</>}</Button><Button variant="ink" size="lg" onClick={handleCheckout} disabled={pending || !chosen}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <><CreditCard className="size-4" />{t("plan.checkout")} <ArrowRight className="size-4" /></>}</Button></div></div>
        <p className="mt-5 text-center text-xs text-muted-foreground">{t("plan.selected")} <strong className="font-bold text-ink">{chosen?.name || ""}</strong> {t("plan.selectedFor")} {store?.name || t("plan.loadingStore")}.</p>
      </main>
      <TransparentPaymentDrawer order={checkoutOrder} onClose={() => setCheckoutOrder(null)} onRefresh={() => api.getDashboard()} onPaid={() => navigate("/dashboard")} />
    </div>
  );
}
