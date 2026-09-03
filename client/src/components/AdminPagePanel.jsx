import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminPagePanel({ title, description, onBack, children, className }) {
  return <main className="px-5 py-6 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-5xl">
      <Button type="button" variant="ghost" className="-ml-3 mb-3" onClick={onBack}><ArrowLeft className="size-4" />Voltar</Button>
      <header className="border-b pb-6"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</header>
      <section className={cn("mt-6 overflow-hidden rounded-xl border bg-card", className)}>{children}</section>
    </div>
  </main>;
}
