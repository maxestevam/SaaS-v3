/** Loja Descomplicada: passos curtos mantêm o onboarding claro e objetivo. */
import { cn } from "@/lib/utils";

const steps = ["Loja", "Plano", "Pronto"];

export function ProgressSteps({ active = 1 }) {
  return (
    <ol className="flex items-center gap-0" aria-label="Progresso de configuração">
      {steps.map((step, index) => {
        const number = index + 1;
        const complete = number < active;
        const current = number === active;
        return (
          <li key={step} className="flex items-center last:flex-none">
            <span className="flex items-center gap-2">
              <span className={cn("flex size-6 items-center justify-center rounded-full border text-[10px] font-black", current || complete ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground")}>
                {complete ? "✓" : number}
              </span>
              <span className={cn("hidden text-[10px] font-extrabold uppercase tracking-[.13em] sm:inline", current ? "text-ink" : "text-muted-foreground")}>{step}</span>
            </span>
            {index < steps.length - 1 && <span className={cn("mx-3 h-px w-5 border-t border-dashed sm:w-8", complete ? "border-primary" : "border-border")} />}
          </li>
        );
      })}
    </ol>
  );
}
