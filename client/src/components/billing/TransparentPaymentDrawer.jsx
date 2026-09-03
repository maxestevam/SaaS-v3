import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, CreditCard, LoaderCircle, QrCode, ShieldCheck, XCircle } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

const publicKey = String(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "").trim();

function orderAmount(order) {
  return (Number(order?.amountCents || 0) / 100).toFixed(2);
}

function formSuffix(order) {
  return String(order?.id || "payment").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function paymentState(order) {
  const status = String(order?.status || "pending").toLowerCase();
  if (status === "approved") return "approved";
  if (["in_process", "pending", "authorized"].includes(status)) return "pending";
  if (["rejected", "cancelled", "canceled"].includes(status)) return "rejected";
  return "pending";
}

export function TransparentPaymentDrawer({ order, onClose, onRefresh, onPaid }) {
  const { t } = useI18n();
  const [currentOrder, setCurrentOrder] = useState(order || null);
  const [method, setMethod] = useState("pix");
  const [pixLoading, setPixLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  const cardFormRef = useRef(null);
  const open = Boolean(order);
  const displayedOrder = currentOrder || order;
  const suffix = useMemo(() => formSuffix(displayedOrder), [displayedOrder?.id]);
  const fields = useMemo(() => ({
    form: `transparent-payment-${suffix}`,
    cardNumber: `transparent-payment-card-number-${suffix}`,
    expirationDate: `transparent-payment-expiration-date-${suffix}`,
    securityCode: `transparent-payment-security-code-${suffix}`,
    cardholderName: `transparent-payment-cardholder-name-${suffix}`,
    issuer: `transparent-payment-issuer-${suffix}`,
    installments: `transparent-payment-installments-${suffix}`,
    identificationType: `transparent-payment-identification-type-${suffix}`,
    identificationNumber: `transparent-payment-identification-number-${suffix}`,
    cardholderEmail: `transparent-payment-cardholder-email-${suffix}`,
  }), [suffix]);

  useEffect(() => {
    setCurrentOrder(order || null);
    setMethod("pix");
    setCardError("");
  }, [order?.id]);

  useEffect(() => {
    if (!open || method !== "card" || !displayedOrder?.id || paymentState(displayedOrder) === "approved") return undefined;
    let disposed = false;
    let instance = null;
    const mount = () => {
      const MercadoPago = window.MercadoPago;
      if (disposed) return;
      if (!publicKey || typeof MercadoPago !== "function") {
        setCardError(t("billing.cardUnavailable"));
        return;
      }
      try {
        const mp = new MercadoPago(publicKey);
        instance = mp.cardForm({
          amount: orderAmount(displayedOrder),
          iframe: true,
          form: {
            id: fields.form,
            cardNumber: { id: fields.cardNumber, placeholder: "Número do cartão" },
            expirationDate: { id: fields.expirationDate, placeholder: "MM/AA" },
            securityCode: { id: fields.securityCode, placeholder: "Código de segurança" },
            cardholderName: { id: fields.cardholderName, placeholder: "Nome como está no cartão" },
            issuer: { id: fields.issuer, placeholder: "Banco emissor" },
            installments: { id: fields.installments, placeholder: "Parcelas" },
            identificationType: { id: fields.identificationType, placeholder: "Tipo de documento" },
            identificationNumber: { id: fields.identificationNumber, placeholder: "Número do documento" },
            cardholderEmail: { id: fields.cardholderEmail, placeholder: "E-mail" },
          },
          callbacks: {
            onFormMounted: (error) => {
              if (error && !disposed) setCardError(t("billing.cardLoadError"));
            },
            onSubmit: async (event) => {
              event?.preventDefault?.();
              if (disposed) return;
              setCardLoading(true);
              setCardError("");
              try {
                const card = instance?.getCardFormData?.() || {};
                if (!card.token || !card.paymentMethodId) throw new Error(t("billing.cardUnavailable"));
                const result = await api.payOrderByCard(displayedOrder.id, displayedOrder.storeId, {
                  token: card.token,
                  paymentMethodId: card.paymentMethodId,
                  installments: Number(card.installments || 1),
                  issuerId: card.issuerId || undefined,
                });
                const nextOrder = { ...displayedOrder, ...(result.order || {}) };
                if (disposed) return;
                setCurrentOrder(nextOrder);
                onRefresh?.();
                if (paymentState(nextOrder) === "approved") {
                  toast.success(t("billing.paymentApproved"));
                  onPaid?.(nextOrder);
                } else if (paymentState(nextOrder) === "rejected") {
                  toast.error(t("billing.cardRejected"));
                } else {
                  toast.success(t("billing.paymentSent"));
                }
              } catch (error) {
                if (!disposed) {
                  const message = error instanceof Error ? error.message : t("billing.cardUnavailable");
                  setCardError(message);
                  toast.error(message);
                }
              } finally {
                if (!disposed) setCardLoading(false);
              }
            },
            onFetching: () => {
              if (!disposed) setSdkLoading(true);
              return () => { if (!disposed) setSdkLoading(false); };
            },
          },
        });
        cardFormRef.current = instance;
      } catch {
        setCardError(t("billing.cardLoadError"));
      }
    };
    const timer = window.setTimeout(mount, 0);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      instance?.unmount?.();
      if (cardFormRef.current === instance) cardFormRef.current = null;
    };
  }, [displayedOrder?.id, displayedOrder?.amountCents, fields, method, open, t]);

  async function generatePix() {
    if (!displayedOrder?.id || !displayedOrder?.storeId) return;
    setPixLoading(true);
    try {
      const result = await api.createPixPayment(displayedOrder.id, displayedOrder.storeId);
      const nextOrder = { ...displayedOrder, ...(result.order || {}) };
      setCurrentOrder(nextOrder);
      onRefresh?.();
      toast.success(t("billing.pixGenerated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("billing.generatePix"));
    } finally {
      setPixLoading(false);
    }
  }

  async function copyPix() {
    if (!displayedOrder?.pixQrCode) return;
    try {
      await navigator.clipboard?.writeText(displayedOrder.pixQrCode);
      toast.success(t("billing.pixCopied"));
    } catch {
      toast.error(t("billing.copyPix"));
    }
  }

  const state = paymentState(displayedOrder);
  const hasPix = Boolean(displayedOrder?.pixQrCode);

  return (
    <Drawer open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose?.(); }}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="border-b border-ink/10 pb-5">
          <div className="flex items-start gap-3 pr-8">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CreditCard className="size-5" /></span>
            <div>
              <DrawerTitle className="font-display text-xl font-semibold tracking-[-.03em] text-ink">{t("billing.payOrder")}</DrawerTitle>
              <DrawerDescription className="mt-1">{t("billing.paymentMethods")}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-ink/10 bg-cream px-4 py-3">
            <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">{t("billing.subscription")}</p><p className="mt-1 text-sm font-semibold text-ink">{displayedOrder?.storeName || t("billing.storeFallback")}</p></div>
            <strong className="font-display text-xl font-semibold tracking-[-.03em] text-ink">R$ {orderAmount(displayedOrder).replace(".", ",")}</strong>
          </div>
          {state === "approved" ? <PaymentNotice tone="approved" icon={<CheckCircle2 className="size-5" />} title={t("billing.paymentApproved")} /> : null}
          {state === "rejected" ? <PaymentNotice tone="rejected" icon={<XCircle className="size-5" />} title={t("billing.cardRejected")} /> : null}
          {state !== "approved" ? <>
            <div className="mt-5 grid grid-cols-2 rounded-xl border border-ink/10 bg-muted/40 p-1">
              <button type="button" onClick={() => { setMethod("pix"); setCardError(""); }} className={cn("flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors", method === "pix" ? "bg-card text-ink shadow-sm" : "text-muted-foreground hover:text-ink")}><QrCode className="size-4" />{t("billing.pix")}</button>
              <button type="button" onClick={() => setMethod("card")} className={cn("flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors", method === "card" ? "bg-card text-ink shadow-sm" : "text-muted-foreground hover:text-ink")}><CreditCard className="size-4" />{t("billing.card")}</button>
            </div>
            {method === "pix" ? <section className="mt-5 space-y-4" aria-label={t("billing.payPix")}>
              {hasPix ? <><p className="text-sm leading-6 text-muted-foreground">{t("billing.pixInstructions")}</p>{displayedOrder.pixQrCodeBase64 ? <div className="flex justify-center rounded-xl border border-ink/10 bg-white p-4"><img src={`data:image/png;base64,${displayedOrder.pixQrCodeBase64}`} alt={t("billing.qrAlt")} className="size-48 rounded-lg object-contain" /></div> : null}<div className="rounded-xl border border-ink/10 bg-muted/30 p-3"><p className="break-all font-mono text-[11px] leading-5 text-ink">{displayedOrder.pixQrCode}</p></div><Button type="button" variant="outline" className="w-full" onClick={copyPix}><Copy className="size-4" />{t("billing.copyPix")}</Button></> : <><p className="text-sm leading-6 text-muted-foreground">{t("billing.payerEmail")}</p><Button type="button" variant="ink" className="w-full" onClick={generatePix} disabled={pixLoading}>{pixLoading ? <LoaderCircle className="size-4 animate-spin" /> : <QrCode className="size-4" />}{t("billing.generatePix")}</Button></>}
            </section> : <section className="mt-5" aria-label={t("billing.payCard")}>
              <form id={fields.form} className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">{t("billing.payerEmail")}</p>
                <PaymentField id={fields.cardNumber} label="Número do cartão" />
                <div className="grid grid-cols-2 gap-3"><PaymentField id={fields.expirationDate} label="Validade" /><PaymentField id={fields.securityCode} label="Código de segurança" /></div>
                <PaymentInput id={fields.cardholderName} label="Nome como está no cartão" />
                <div className="grid grid-cols-2 gap-3"><PaymentSelect id={fields.issuer} label="Banco emissor" /><PaymentSelect id={fields.installments} label="Parcelas" /></div>
                <div className="grid grid-cols-3 gap-3"><PaymentSelect id={fields.identificationType} label="Documento" /><div className="col-span-2"><PaymentInput id={fields.identificationNumber} label="Número do documento" /></div></div>
                <PaymentInput id={fields.cardholderEmail} label="E-mail" type="email" />
                {cardError ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{cardError}</p> : null}
                <Button id={`${fields.form}-submit`} type="submit" variant="ink" className="w-full" disabled={cardLoading || sdkLoading}>{cardLoading || sdkLoading ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}{t("billing.payCard")}</Button>
              </form>
            </section>}
          </> : null}
          <div className="mt-5 flex gap-3 rounded-xl bg-sage/10 p-3 text-xs leading-5 text-ink"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-sage" />{t("billing.payerEmail")}</div>
        </div>
        <DrawerFooter><Button type="button" variant="outline" onClick={() => onClose?.()}>{state === "approved" ? t("billing.details") : t("account.cancel")}</Button></DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function PaymentNotice({ tone, icon, title }) {
  return <div className={cn("mt-5 flex gap-3 rounded-xl border p-4 text-sm", tone === "approved" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-destructive/30 bg-destructive/10 text-destructive")}><span className="mt-0.5 shrink-0">{icon}</span><p className="font-semibold">{title}</p></div>;
}

function PaymentField({ id, label }) {
  return <label className="grid gap-1.5 text-xs font-bold text-ink"><span>{label}</span><div id={id} className="min-h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm" /></label>;
}

function PaymentInput({ id, label, type = "text" }) {
  return <label className="grid gap-1.5 text-xs font-bold text-ink"><span>{label}</span><input id={id} type={type} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary" /></label>;
}

function PaymentSelect({ id, label }) {
  return <label className="grid gap-1.5 text-xs font-bold text-ink"><span>{label}</span><select id={id} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary"><option value="">{label}</option></select></label>;
}
