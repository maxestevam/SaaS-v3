/** Papel & Prateleira: campos serenos, legíveis e focados em uma decisão por vez. */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef(function Input({ className, capitalization, onChange, type = "text", autoCapitalize, ...props }, ref) {
  const mode = capitalization ?? (textualType(type) ? "sentence" : "none");
  const handleChange = (event) => {
    if (mode !== "none") event.target.value = capitalize(event.target.value, mode);
    onChange?.(event);
  };
  return (
    <input
      ref={ref}
      type={type}
      autoCapitalize={autoCapitalize ?? (mode === "words" ? "words" : mode === "sentence" ? "sentences" : "none")}
      onChange={handleChange}
      className={cn(
        "flex h-11 w-full rounded-[10px] border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

function textualType(type) { return !["email", "url", "password", "number", "date", "datetime-local", "time", "color", "file", "hidden", "checkbox", "radio", "range"].includes(type); }
function capitalize(value, mode) { const text = String(value || ""); if (mode === "words") return text.replace(/(^|\s)(\p{L})/gu, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("pt-BR")}`); return text.replace(/(^|[.!?]\s+|\n\s*)(\p{L})/gu, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("pt-BR")}`); }
