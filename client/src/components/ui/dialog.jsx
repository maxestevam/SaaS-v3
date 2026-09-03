import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const focusableSelector = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function Dialog({ open, onOpenChange, title, description, children, className, fullscreen = false, page = false }) {
  const dialogRef = useRef(null);
  const isFullscreen = true;
  useEffect(() => {
    if (!open || page) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const appRoot = document.getElementById("root");
    const previousInert = appRoot?.inert;
    const previousAriaHidden = appRoot?.getAttribute("aria-hidden");
    document.body.style.overflow = "hidden";
    if (appRoot) { appRoot.inert = true; appRoot.setAttribute("aria-hidden", "true"); }
    const focusFirst = () => dialogRef.current?.querySelector(focusableSelector)?.focus();
    const onKeyDown = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) { event.preventDefault(); event.stopPropagation(); focusFirst(); return; }
      if (event.key === "Escape") { onOpenChange(false); return; }
      if (event.key !== "Tab") return;
      const items = [...(dialogRef.current?.querySelectorAll(focusableSelector) || [])];
      if (!items.length) { event.preventDefault(); dialogRef.current?.focus(); return; }
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const onFocusIn = (event) => { if (dialogRef.current && !dialogRef.current.contains(event.target)) focusFirst(); };
    const blockBackgroundEvent = (event) => { if (dialogRef.current && !dialogRef.current.contains(event.target)) { event.preventDefault(); event.stopPropagation(); } };
    window.setTimeout(focusFirst, 0);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("pointerdown", blockBackgroundEvent, true);
    document.addEventListener("click", blockBackgroundEvent, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (appRoot) { appRoot.inert = Boolean(previousInert); if (previousAriaHidden === null) appRoot.removeAttribute("aria-hidden"); else appRoot.setAttribute("aria-hidden", previousAriaHidden); }
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("pointerdown", blockBackgroundEvent, true);
      document.removeEventListener("click", blockBackgroundEvent, true);
      previousFocus?.focus?.();
    };
  }, [open, onOpenChange, page]);
  if (!open) return null;
  if (page) return <div className={cn("min-h-0", className)} data-page-panel={title}>{children}</div>;
  const dialog = <div ref={dialogRef} tabIndex={-1} className={cn("fixed inset-0 flex items-center justify-center pointer-events-auto", isFullscreen ? "z-[120] p-0" : "z-[70] p-4 sm:p-6")} role="dialog" aria-modal="true" aria-label={title}>
    <button className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} aria-label="Fechar" />
    <section className={cn("relative z-10 flex w-full flex-col overflow-hidden bg-card shadow-2xl", isFullscreen ? "h-[100dvh] max-h-none max-w-none rounded-none border-0" : "max-h-[calc(100vh-2rem)] max-w-3xl rounded-2xl border", !isFullscreen && className)}>
      <header className="flex items-start justify-between border-b px-5 py-4 sm:px-6"><div><h2 className="text-lg font-bold tracking-tight">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div><button onClick={() => onOpenChange(false)} className="ml-4 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fechar"><X className="size-5" /></button></header>
      {children}
    </section>
  </div>;
  return createPortal(dialog, document.body);
}
