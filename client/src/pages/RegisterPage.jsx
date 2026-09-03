import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  async function handleSubmit(event) { event.preventDefault(); if (form.password.length < 8) return toast.error(t("auth.passwordMinimum")); setPending(true); try { const result = await api.register(form); localStorage.setItem("ld_token", result.token); localStorage.setItem("ld_user", JSON.stringify(result.user)); navigate("/onboarding/store"); } catch (error) { toast.error(error.message); } finally { setPending(false); } }
  return <AuthLayout eyebrow={t("auth.registerEyebrow")} title={t("auth.registerTitle")} description={t("auth.registerDescription")} footer={<>{t("auth.hasAccount")} <Link href="/login" className="font-bold text-ink underline decoration-primary decoration-2 underline-offset-4">{t("auth.enter")}</Link></>}><GoogleAuthButton /><form onSubmit={handleSubmit} className="space-y-4" noValidate><div className="space-y-2"><Label htmlFor="name">{t("auth.name")}</Label><Input id="name" autoComplete="name" required placeholder={t("auth.namePlaceholder")} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="email">{t("auth.bestEmail")}</Label><Input id="email" type="email" autoComplete="email" required placeholder={t("auth.emailPlaceholder")} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="password">{t("auth.definePassword")}</Label><Input id="password" type="password" autoComplete="new-password" minLength="8" required placeholder={t("auth.passwordMinimumPlaceholder")} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div><p className="flex gap-2 pt-1 text-xs leading-5 text-muted-foreground"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" />{t("auth.trialNotice")}</p><Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <>{t("auth.register")} <ArrowRight className="size-4" /></>}</Button><p className="pt-1 text-center text-[11px] leading-5 text-muted-foreground">{t("auth.terms")}</p></form></AuthLayout>;
}
