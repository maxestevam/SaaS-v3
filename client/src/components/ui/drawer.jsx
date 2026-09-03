/** Primitive Drawer shadcn/ui baseada em Vaul para fluxos mobile de Loja Descomplicada. */
import { forwardRef, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

export const Drawer = DrawerPrimitive.Root;
export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerClose = DrawerPrimitive.Close;

export const DrawerContent = forwardRef(function DrawerContent({ className, children, style, ...props }, ref) {
  const [visualHeight, setVisualHeight] = useState(null);
  const fullscreen = /(?:max-h-\[9[245]vh\]|h-\[95dvh\])/.test(className || "");
  useEffect(() => { const viewport = window.visualViewport; if (!viewport) return; const sync = () => setVisualHeight(Math.round(viewport.height)); sync(); viewport.addEventListener("resize", sync); viewport.addEventListener("scroll", sync); return () => { viewport.removeEventListener("resize", sync); viewport.removeEventListener("scroll", sync); }; }, []);
  const drawerStyle = { ...style, "--drawer-visual-height": visualHeight ? `${visualHeight}px` : undefined };
  return <DrawerPrimitive.Portal><DrawerPrimitive.Overlay className={cn("fixed inset-0 bg-black/45", fullscreen ? "z-[120]" : "z-50")} /><DrawerPrimitive.Content ref={ref} style={drawerStyle} className={cn(fullscreen ? "fixed inset-0 z-[120] flex h-[100dvh] max-h-none flex-col overflow-hidden border-0 bg-card text-card-foreground outline-none" : "fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[calc(var(--drawer-visual-height,100dvh)-12px)] flex-col overflow-hidden rounded-t-[26px] border border-border bg-card text-card-foreground outline-none", !fullscreen && className)} {...props}>{fullscreen ? <DrawerPrimitive.Close asChild><button type="button" className="absolute right-3 top-3 z-20 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fechar"><X className="size-5" /></button></DrawerPrimitive.Close> : <div className="mx-auto my-3 shrink-0 h-1.5 w-12 rounded-full bg-muted-foreground/30" />}{children}</DrawerPrimitive.Content></DrawerPrimitive.Portal>;
});

export const DrawerHeader = ({ className, ...props }) => <div className={cn("grid gap-1.5 px-5 pb-4 text-left", className)} {...props} />;
export const DrawerFooter = ({ className, ...props }) => <div className={cn("mt-auto shrink-0 border-t bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]", className)} {...props} />;
export const DrawerTitle = forwardRef(function DrawerTitle({ className, ...props }, ref) { return <DrawerPrimitive.Title ref={ref} className={cn("text-base font-semibold", className)} {...props} />; });
export const DrawerDescription = forwardRef(function DrawerDescription({ className, ...props }, ref) { return <DrawerPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />; });
