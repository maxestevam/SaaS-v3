/** Loja Descomplicada: uma rota inexistente oferece uma saída clara para o aplicativo. */
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useI18n } from "@/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return <div className="flex min-h-screen flex-col bg-background p-6"><BrandMark /><main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">{t("notFound.eyebrow")}</p><h1 className="mt-4 font-display text-5xl font-bold leading-none tracking-[-.06em] text-foreground">{t("notFound.title")}</h1><p className="mt-5 text-sm leading-6 text-muted-foreground">{t("notFound.description")}</p><Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-foreground underline decoration-primary decoration-2 underline-offset-4"><ArrowLeft className="size-4" />{t("notFound.back")}</Link></main></div>;
}
