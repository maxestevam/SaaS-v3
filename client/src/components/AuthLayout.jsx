/** Loja Descomplicada: autenticação direta, responsiva e alinhada ao sistema neutral do aplicativo. */
import { BrandMark } from "@/components/BrandMark";

export function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <div className="min-h-[100dvh] bg-[#fbfbfc] text-ink lg:grid lg:grid-cols-[minmax(0,58%)_minmax(420px,42%)]">
      <main className="relative flex min-h-[100dvh] flex-col px-5 py-6 sm:px-10 lg:px-[clamp(3rem,8.2vw,8.5rem)] lg:py-9">
        <BrandMark />
        <section className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-12 sm:py-16 lg:mx-0 lg:py-12">
          <div className="mb-9">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[.18em] text-primary">{eyebrow}</p>
            <h1 className="font-display text-[2.45rem] font-semibold leading-[.98] tracking-[-.052em] text-ink sm:text-5xl lg:text-[3.35rem]">{title}</h1>
            {description && <p className="mt-4 max-w-[24rem] text-sm leading-6 text-muted-foreground sm:text-[15px]">{description}</p>}
          </div>
          {children}
        </section>
        {footer && <div className="pb-1 pt-7 text-sm text-muted-foreground">{footer}</div>}
      </main>
      <aside className="relative hidden overflow-hidden bg-[#08080a] lg:block">
        <div className="primary-gradient absolute -right-[14%] top-[9%] h-[22%] w-[128%] -rotate-[10deg] shadow-[0_24px_80px_rgba(255,86,79,.18)]" aria-hidden="true" />
        <div className="absolute left-12 top-16 xl:left-16"><BrandMark inverse /></div>
        <div className="absolute inset-x-10 bottom-12 rounded-[1.65rem] border border-white/15 bg-white/[.035] p-7 text-white backdrop-blur-sm xl:inset-x-14 xl:bottom-16 xl:p-8"><span className="inline-flex rounded-full border border-white/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/75">Gestão simplificada</span><p className="mt-5 max-w-md font-display text-4xl font-semibold leading-[1.15] tracking-[-.052em]">Organize a sua loja sem complicação.</p><p className="mt-4 max-w-md text-sm leading-6 text-white/65">Produtos, pedidos e clientes no mesmo espaço, no seu ritmo.</p></div>
      </aside>
    </div>
  );
}
