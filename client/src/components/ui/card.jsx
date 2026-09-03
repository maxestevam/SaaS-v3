/** Superfícies neutral reutilizáveis para as páginas do aplicativo. */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn("rounded-[14px] border border-border bg-card text-card-foreground shadow-[0_18px_38px_rgba(23,43,58,.06)]", className)} {...props} />;
});

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("flex flex-col gap-1.5 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h2 className={cn("text-base font-semibold tracking-tight", className)} {...props} />;
}
