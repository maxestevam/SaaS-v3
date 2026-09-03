/** Loja Descomplicada: o gradiente rosa-laranja destaca decisões primárias sem abandonar a base shadcn/ui. */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "primary-gradient text-white shadow-[0_10px_22px_rgba(255,50,178,.22)] hover:brightness-105",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
  ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  ink: "bg-foreground text-background hover:opacity-90 shadow-sm",
};

const sizes = {
  default: "h-11 px-5 text-sm",
  sm: "h-9 px-3.5 text-xs",
  lg: "h-12 px-6 text-sm",
  icon: "size-10",
};

export const Button = forwardRef(function Button(
  { className, variant = "default", size = "default", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-sans font-bold tracking-[-0.01em] transition-[transform,background-color,color,box-shadow,border-color] duration-150 ease-[cubic-bezier(.23,1,.32,1)] active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
