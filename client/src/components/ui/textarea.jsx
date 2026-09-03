/** Papel & Prateleira: áreas de texto tratadas como uma nota breve de operação. */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef(function Textarea({ className, capitalization = "sentence", onChange, autoCapitalize, ...props }, ref) {
  const handleChange = (event) => { if (capitalization !== "none") event.target.value = capitalize(event.target.value, capitalization); onChange?.(event); };
  return (
    <textarea
      ref={ref}
      autoCapitalize={autoCapitalize ?? (capitalization === "words" ? "words" : capitalization === "sentence" ? "sentences" : "none")}
      onChange={handleChange}
      className={cn(
        "flex min-h-28 w-full rounded-[10px] border border-input bg-background px-3.5 py-3 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

function capitalize(value, mode) { const text = String(value || ""); if (mode === "words") return text.replace(/(^|\s)(\p{L})/gu, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("pt-BR")}`); return text.replace(/(^|[.!?]\s+|\n\s*)(\p{L})/gu, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("pt-BR")}`); }
