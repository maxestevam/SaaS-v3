import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { GoogleAuthButton, GoogleCallbackLoader } from "@/components/GoogleAuthButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  async function handleSubmit(event) { event.preventDefault(); setPending(true); try { const result = await api.login(form); localStorage.setItem("ld_token", result.token); localStorage.setItem("ld_user", JSON.stringify(result.user)); navigate(result.user?.onboardingComplete ? "/dashboard" : "/onboarding/store"); } catch (error) { toast.error(error.message); } finally { setPending(false); } }
  return <AuthLayout eyebrow={t("auth.loginEyebrow")} title={t("auth.loginTitle")} description={t("auth.loginDescription")} footer={<>{t("auth.noAccount")} <Button type="button" variant="link" className="h-auto px-1 font-bold text-foreground underline decoration-primary decoration-2 underline-offset-4" onClick={() => navigate("/register")}>{t("auth.createAccount")}</Button></>}><GoogleCallbackLoader onComplete={(user) => navigate(user?.onboardingCompletedAt ? "/dashboard" : "/onboarding/store")} /><GoogleAuthButton /><form onSubmit={handleSubmit} className="space-y-5" noValidate><div className="space-y-2"><Label htmlFor="email">{t("auth.email")}</Label><Input id="email" type="email" autoComplete="email" required placeholder={t("auth.emailPlaceholder")} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">{t("auth.password")}</Label><Link href="/forgot-password" className="text-xs font-bold text-primary hover:underline">{t("auth.forgotPassword")}</Link></div><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required placeholder={t("auth.passwordPlaceholder")} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="pr-12" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1 flex size-9 items-center justify-center text-muted-foreground" aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div><Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <>{t("auth.login")} <ArrowRight className="size-4" /></>}</Button></form></AuthLayout>;
}
