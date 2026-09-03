import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CollapsibleCard({ title, icon: Icon, children, defaultOpen = true, keepMounted = false, className }) {
  const [open, setOpen] = useState(defaultOpen);
  return <Card className={cn(className)}><button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 p-5 text-left" aria-expanded={open}><span className="flex size-9 items-center justify-center rounded-lg bg-muted">{Icon && <Icon className="size-4" />}</span><strong className="flex-1 text-sm">{title}</strong><ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} /></button>{(open || keepMounted) && <CardContent className={cn("border-t pt-5", !open && "hidden")} aria-hidden={!open}>{children}</CardContent>}</Card>;
}
