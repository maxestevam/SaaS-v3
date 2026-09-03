import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogCancel = AlertDialogPrimitive.Cancel;
const AlertDialogAction = AlertDialogPrimitive.Action;

const AlertDialogOverlay = forwardRef(({ className, ...props }, ref) => <AlertDialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-[90] bg-black/55 backdrop-blur-[1px]", className)} {...props} />);
AlertDialogOverlay.displayName = "AlertDialogOverlay";

const AlertDialogContent = forwardRef(({ className, ...props }, ref) => <AlertDialogPortal><AlertDialogOverlay /><AlertDialogPrimitive.Content ref={ref} className={cn("fixed left-1/2 top-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-popover p-6 text-popover-foreground shadow-2xl outline-none", className)} {...props} /></AlertDialogPortal>);
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogTitle = forwardRef(({ className, ...props }, ref) => <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-bold tracking-tight", className)} {...props} />);
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = forwardRef(({ className, ...props }, ref) => <AlertDialogPrimitive.Description ref={ref} className={cn("mt-2 text-sm leading-6 text-muted-foreground", className)} {...props} />);
AlertDialogDescription.displayName = "AlertDialogDescription";

export { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction };
