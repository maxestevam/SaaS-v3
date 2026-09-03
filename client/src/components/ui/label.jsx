/** Papel & Prateleira: rótulos compactos que antecedem a ação sem competir com ela. */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Label = forwardRef(function Label({ className, ...props }, ref) {
  return <label ref={ref} className={cn("text-sm font-bold text-ink", className)} {...props} />;
});
