import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Mantém ações de formulário disponíveis sem disputar atenção durante a leitura descendente. */
export function useContextualSaveVisibility(enabled = true) {
  const [visible, setVisible] = useState(true);
  const lastPosition = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") { setVisible(false); return undefined; }
    lastPosition.current = Math.max(0, window.scrollY);
    setVisible(true);
    const onScroll = () => {
      const current = Math.max(0, window.scrollY);
      const delta = current - lastPosition.current;
      if (current < 20 || delta < -7) setVisible(true);
      else if (delta > 12) setVisible(false);
      lastPosition.current = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  return visible;
}

export function ContextualSaveBar({ visible, children, className }) {
  return <div aria-hidden={!visible} className={cn("sticky bottom-[calc(9.25rem+env(safe-area-inset-bottom))] z-10 mt-5 transition-all duration-200 motion-reduce:transition-none sm:bottom-3", visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0", className)}>{children}</div>;
}
