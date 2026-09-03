/** Loja Descomplicada: usa os ativos oficiais em formato integral ou compacto conforme a superfície. */
import { Link } from "wouter";
import { cn } from "@/lib/utils";
export function BrandMark({ compact = false, inverse = false, className }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} aria-label="Loja Descomplicada">
      <img src="/manus-storage/logo_c052c608.png" alt="Loja Descomplicada" className={cn("h-10 w-auto max-w-[205px] object-contain object-left transition-transform duration-150 group-hover:-translate-y-0.5 group-active:scale-[0.97]", compact && "h-9 max-w-[136px]", inverse && "rounded-md bg-white/95 px-1")} />
    </Link>
  );
}
