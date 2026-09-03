/** Loja Descomplicada: a nova senha conclui o acesso de forma direta. */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (password.length < 8) return toast.error(t("auth.passwordMinimum"));
    if (password !== confirmPassword) return toast.error(t("auth.passwordsMatch"));
    setPending(true);
    try { await api.resetPassword({ token, password }); setComplete(true); } catch (error) { toast.error(error.message); } finally { setPending(false); }
  }

  return (
    <AuthLayout eyebrow={t("auth.resetEyebrow")} title={complete ? t("auth.resetCompleteTitle") : t("auth.resetTitle")} description={complete ? t("auth.resetCompleteDescription") : t("auth.resetDescription")} footer={!complete && <Link href="/login" className="font-bold text-ink underline decoration-primary decoration-2 underline-offset-4">{t("auth.backToLogin")}</Link>}>
      {complete ? <div className="rounded-[14px] border border-sage/30 bg-sage/10 p-6"><CheckCircle2 className="mb-4 size-7 text-sage" /><p className="text-sm leading-6 text-muted-foreground">{t("auth.resetHint")}</p><Button className="mt-5 w-full" onClick={() => navigate("/login")}>{t("auth.enterNow")} <ArrowRight className="size-4" /></Button></div> : <form onSubmit={handleSubmit} className="space-y-5"><div className="space-y-2"><Label htmlFor="password">{t("auth.newPassword")}</Label><Input id="password" type="password" autoComplete="new-password" minLength="8" required placeholder={t("auth.passwordMinimumPlaceholder")} value={password} onChange={(event) => setPassword(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="confirm-password">{t("auth.repeatPassword")}</Label><Input id="confirm-password" type="password" autoComplete="new-password" required placeholder={t("auth.repeatPasswordPlaceholder")} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div><Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <>{t("auth.saveNewPassword")} <ArrowRight className="size-4" /></>}</Button></form>}
    </AuthLayout>
  );
}
