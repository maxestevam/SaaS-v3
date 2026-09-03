import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

function DropdownMenuContent({ className, sideOffset = 6, ...props }) {
  return <DropdownMenuPortal><DropdownMenuPrimitive.Content sideOffset={sideOffset} className={cn("z-[100] min-w-52 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-2xl outline-none", className)} {...props} /></DropdownMenuPortal>;
}

function DropdownMenuItem({ className, inset, ...props }) {
  return <DropdownMenuPrimitive.Item className={cn("relative flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-colors focus:bg-primary focus:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", inset && "pl-8", className)} {...props} />;
}

function DropdownMenuCheckboxItem({ className, children, checked, ...props }) {
  return <DropdownMenuPrimitive.CheckboxItem checked={checked} className={cn("relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2.5 text-sm outline-none transition-colors focus:bg-primary focus:text-primary-foreground", className)} {...props}><span className="absolute left-2 flex size-4 items-center justify-center">{checked && <Check className="size-3.5" />}</span>{children}</DropdownMenuPrimitive.CheckboxItem>;
}

function DropdownMenuRadioItem({ className, children, ...props }) {
  return <DropdownMenuPrimitive.RadioItem className={cn("relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2.5 text-sm outline-none transition-colors focus:bg-primary focus:text-primary-foreground", className)} {...props}><span className="absolute left-2 flex size-4 items-center justify-center"><DropdownMenuPrimitive.ItemIndicator><Circle className="size-2 fill-current" /></DropdownMenuPrimitive.ItemIndicator></span>{children}</DropdownMenuPrimitive.RadioItem>;
}

function DropdownMenuLabel({ className, inset, ...props }) { return <DropdownMenuPrimitive.Label className={cn("px-2.5 py-1.5 text-xs font-bold text-muted-foreground", inset && "pl-8", className)} {...props} />; }
function DropdownMenuSeparator({ className, ...props }) { return <DropdownMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />; }
function DropdownMenuShortcut({ className, ...props }) { return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />; }
function DropdownMenuSubTrigger({ className, inset, children, ...props }) { return <DropdownMenuPrimitive.SubTrigger className={cn("flex cursor-default select-none items-center rounded-lg px-2.5 py-2 text-sm outline-none focus:bg-primary focus:text-primary-foreground", inset && "pl-8")} {...props}>{children}<ChevronRight className="ml-auto size-4" /></DropdownMenuPrimitive.SubTrigger>; }
function DropdownMenuSubContent({ className, ...props }) { return <DropdownMenuPrimitive.SubContent className={cn("z-[100] min-w-44 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-2xl", className)} {...props} />; }

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger };
