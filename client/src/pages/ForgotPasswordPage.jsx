/** Loja Descomplicada: recuperação de acesso simples, clara e acolhedora. */
import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, MailCheck, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault(); setPending(true);
    try { await api.forgotPassword({ email }); setSent(true); } catch (error) { toast.error(error.message); } finally { setPending(false); }
  }

  return (
    <AuthLayout eyebrow={t("auth.forgotEyebrow")} title={sent ? t("auth.forgotSentTitle") : t("auth.forgotTitle")} description={sent ? t("auth.resetEmailSent", { email }) : t("auth.forgotDescription")} footer={<Link href="/login" className="font-bold text-ink underline decoration-primary decoration-2 underline-offset-4">{t("auth.backToLogin")}</Link>}>
      {sent ? <div className="rounded-[14px] border border-primary/20 bg-primary/5 p-6"><MailCheck className="mb-4 size-7 text-primary" /><p className="text-sm leading-6 text-muted-foreground">{t("auth.sentHint")}</p><Button variant="outline" className="mt-5 w-full" onClick={() => setSent(false)}>{t("auth.useAnotherEmail")}</Button></div> : <form onSubmit={handleSubmit} className="space-y-5"><div className="space-y-2"><Label htmlFor="email">{t("auth.registeredEmail")}</Label><Input id="email" type="email" required autoComplete="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={(event) => setEmail(event.target.value)} /></div><Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <>{t("auth.sendRecovery")} <ArrowRight className="size-4" /></>}</Button></form>}
    </AuthLayout>
  );
}
