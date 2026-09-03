import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const STORE_CATEGORIES = [
  "Alimentos e bebidas", "Moda e acessórios", "Beleza e cosméticos", "Saúde e bem-estar", "Casa e decoração",
  "Eletrônicos", "Informática", "Papelaria e livros", "Brinquedos e jogos", "Pet shop",
  "Esportes e lazer", "Automotivo", "Joias e relógios", "Artesanato", "Serviços",
  "Floricultura", "Bebês e infantil", "Jardinagem", "Música e instrumentos", "Produtos digitais",
];

export function StoreCategorySelect({ id = "store-category", value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => STORE_CATEGORIES.filter((category) => category.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const choose = (category) => { onChange(category); setQuery(""); setOpen(false); };
  return <div className="relative"><Button id={id} type="button" variant="outline" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="h-10 w-full justify-between bg-card text-left font-normal"><span className={cn("truncate", !value && "text-muted-foreground")}>{value || "Selecione a categoria da sua loja"}</span><ChevronDown className="size-4 shrink-0 text-muted-foreground" /></Button>{open && <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-card p-2 shadow-xl"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar categoria" className="pl-9" /></div><div role="listbox" aria-labelledby={id} className="mt-2 max-h-60 overflow-y-auto"><button type="button" role="option" aria-selected={!value} onClick={() => choose("")} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted", !value && "bg-muted font-semibold")}><span className="size-4">{!value && <Check className="size-4" />}</span>Sem categoria</button>{filtered.length ? filtered.map((category) => <button key={category} type="button" role="option" aria-selected={value === category} onClick={() => choose(category)} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted", value === category && "bg-muted font-semibold")}><span className="size-4">{value === category && <Check className="size-4" />}</span>{category}</button>) : <p className="px-3 py-4 text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>}</div></div>}</div>;
}
