import { ArrowLeft, CheckCircle2, CircleDollarSign, Clock3, LoaderCircle, PackageCheck, Search, Send, ShoppingBag, Truck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveStore } from "@/contexts/ActiveStoreContext";
import { api } from "@/lib/api";
import { formatAdminCurrency, formatAdminDate } from "@/lib/admin-value-formatters";
import { toast } from "sonner";

const initialFilters = { q: "", status: "", paymentStatus: "", page: 1, limit: 20 };
const statusMeta = {
  pending_payment: ["Aguardando pagamento", "bg-amber-500/10 text-amber-700 dark:text-amber-300"],
  paid: ["Pago", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"],
  paid_stock_exception: ["Revisar estoque", "bg-rose-500/10 text-rose-700 dark:text-rose-300"],
  processing: ["Em preparo", "bg-sky-500/10 text-sky-700 dark:text-sky-300"],
  shipped: ["Enviado", "bg-violet-500/10 text-violet-700 dark:text-violet-300"],
  delivered: ["Entregue", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"],
  cancelled: ["Cancelado", "bg-muted text-muted-foreground"],
};
const paymentMeta = { approved: "Aprovado", pending: "Pendente", in_process: "Em análise", rejected: "Recusado", cancelled: "Cancelado", refunded: "Estornado", charged_back: "Contestação", failed: "Falhou" };

export default function OrdersPage() { return <AppShell><OrdersContent /></AppShell>; }

export function OrdersContent() {
  const { store } = useActiveStore();
  const [location, navigate] = useLocation();
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }, summary: {} });
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const orderId = /^\/orders\/([^/]+)$/.exec(location)?.[1] || "";

  const load = async (next = filters) => {
    if (!store?.id) { setLoading(false); return; }
    setLoading(true);
    try { setResult(await api.getStoreOrders(store.id, next)); }
    catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(filters); }, [store?.id, filters.page, filters.status, filters.paymentStatus]);
  useEffect(() => {
    let cancelled = false;
    if (!store?.id || !orderId) { setDetail(null); return undefined; }
    setDetailLoading(true);
    api.getStoreOrder(store.id, orderId).then((response) => { if (!cancelled) setDetail(response.order); }).catch((error) => { if (!cancelled) { toast.error(error.message); navigate("/orders"); } }).finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [store?.id, orderId]);
  const submitSearch = (event) => { event.preventDefault(); setFilters((current) => ({ ...current, page: 1 })); load({ ...filters, page: 1 }); };
  const change = (patch) => setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  const advance = async () => {
    const nextStatus = nextOrderStatus(detail?.status);
    if (!nextStatus || !store?.id || !detail) return;
    setUpdating(true);
    try { const response = await api.updateStoreOrderStatus(store.id, detail.id, nextStatus); setDetail(response.order); toast.success(`Pedido atualizado para ${statusLabel(nextStatus)}.`); await load(); }
    catch (error) { toast.error(error.message); }
    finally { setUpdating(false); }
  };

  if (!store?.id) return <main className="mx-auto max-w-2xl px-5 py-16"><EmptyState /></main>;
  if (orderId) return <OrderDetail order={detail} loading={detailLoading} onBack={() => navigate("/orders")} onAdvance={advance} updating={updating} />;
  return <main className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-12"><header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Vendas da loja</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Pedidos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Acompanhe pagamentos aprovados e avance o preparo e a entrega dos pedidos da <strong className="text-foreground">{store.name}</strong>.</p></div></header><OrderSummary summary={result.summary} /><section className="mt-6"><form onSubmit={submitSearch} className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Pesquisar pedidos" value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Pedido, cliente ou e-mail" className="pl-9" /></div><Button type="submit" variant="outline">Buscar</Button></form><div className="mt-3 grid gap-3 sm:grid-cols-2"><SelectFilter label="Situação do pedido" value={filters.status} onChange={(status) => change({ status })} options={[["", "Todos os pedidos"], ...Object.entries(statusMeta).map(([value, [label]]) => [value, label])]} /><SelectFilter label="Pagamento" value={filters.paymentStatus} onChange={(paymentStatus) => change({ paymentStatus })} options={[["", "Todos os pagamentos"], ...Object.entries(paymentMeta)]} /></div></section><OrdersList data={result.data} loading={loading} onOpen={(id) => navigate(`/orders/${id}`)} /><Pagination pagination={result.pagination} onChange={(page) => change({ page })} /></main>;
}

function OrderSummary({ summary = {} }) { const cards = [[CircleDollarSign, "Total vendido", formatAdminCurrency(summary.totalCents || 0)], [Clock3, "Aguardando pagamento", summary.pendingPayment || 0], [PackageCheck, "Em preparo", summary.processing || 0], [Truck, "Enviados", summary.shipped || 0]]; return <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(([Icon, label, value]) => <Card key={label}><CardContent className="flex items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-muted"><Icon className="size-4 text-muted-foreground" /></span><span><small className="block text-xs text-muted-foreground">{label}</small><strong className="mt-1 block text-lg">{value}</strong></span></CardContent></Card>)}</section>; }
function OrdersList({ data, loading, onOpen }) { if (loading) return <section className="mt-6 overflow-hidden rounded-xl border bg-card p-5"><div className="space-y-4">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div></section>; if (!data.length) return <section className="mt-6"><EmptyState /></section>; return <section className="mt-6 overflow-hidden rounded-xl border bg-card"><div className="hidden grid-cols-[1fr_1.4fr_.8fr_.8fr_.7fr_110px] gap-4 border-b bg-muted/30 px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground lg:grid"><span>Pedido</span><span>Cliente</span><span>Pagamento</span><span>Situação</span><span>Total</span><span /></div><div className="divide-y">{data.map((order) => <article key={order.id} className="grid gap-3 p-5 lg:grid-cols-[1fr_1.4fr_.8fr_.8fr_.7fr_110px] lg:items-center lg:gap-4"><div><strong className="text-sm">{order.orderNumber}</strong><small className="mt-1 block text-xs text-muted-foreground">{formatAdminDate(order.createdAt)}</small></div><div><strong className="block truncate text-sm">{order.customerName}</strong><small className="block truncate text-xs text-muted-foreground">{order.customerEmail}</small><small className="mt-1 block text-xs text-muted-foreground">{order.itemCount} item(ns) · {order.quantity} unidade(s)</small></div><InfoPill label={paymentMeta[order.paymentStatus] || order.paymentStatus} /><StatusPill status={order.status} /><strong className="text-sm">{formatAdminCurrency(order.totalCents)}</strong><Button type="button" variant="outline" size="sm" onClick={() => onOpen(order.id)}>Detalhes</Button></article>)}</div></section>; }
function OrderDetail({ order, loading, onBack, onAdvance, updating }) { if (loading) return <main className="mx-auto max-w-5xl px-5 py-8"><Skeleton className="h-10 w-40" /><Skeleton className="mt-5 h-80 w-full" /></main>; if (!order) return null; const nextStatus = nextOrderStatus(order.status); const address = order.shippingAddress || {}; return <main className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 lg:px-12"><Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="size-4" />Voltar para pedidos</Button><header className="mt-6 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Pedido</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{order.orderNumber}</h1><p className="mt-2 text-sm text-muted-foreground">Realizado em {formatAdminDate(order.createdAt)} por {order.customerName}.</p></div><div className="flex flex-wrap gap-2"><InfoPill label={paymentMeta[order.paymentStatus] || order.paymentStatus} /><StatusPill status={order.status} /></div></header><div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]"><section className="overflow-hidden rounded-xl border bg-card"><div className="border-b p-5"><h2 className="font-semibold">Itens do pedido</h2></div><div className="divide-y">{order.items.map((item) => <article key={item.id} className="flex gap-4 p-5"><span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">{item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : <ShoppingBag className="size-4 text-muted-foreground" />}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{item.name}</strong>{item.sku && <small className="mt-1 block text-xs text-muted-foreground">SKU: {item.sku}</small>}<small className="mt-1 block text-xs text-muted-foreground">{item.quantity} × {formatAdminCurrency(item.unitPriceCents)}</small></span><strong className="shrink-0 text-sm">{formatAdminCurrency(item.totalCents)}</strong></article>)}</div></section><aside className="space-y-5"><Card><CardContent className="space-y-3 p-5"><h2 className="font-semibold">Resumo</h2><SummaryLine label="Subtotal" value={formatAdminCurrency(order.subtotalCents)} /><SummaryLine label="Frete" value={formatAdminCurrency(order.shippingCents)} /><div className="border-t pt-3"><SummaryLine label="Total" value={formatAdminCurrency(order.totalCents)} strong /></div></CardContent></Card><Card><CardContent className="p-5"><div className="flex items-center gap-2"><UserRound className="size-4" /><h2 className="font-semibold">Entrega</h2></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{[address.recipientName, address.street && `${address.street}, ${address.number}`, address.complement, address.district, address.city && `${address.city} — ${address.state}`, address.postalCode && `CEP ${address.postalCode}`].filter(Boolean).join("\n") || "Endereço não informado."}</p></CardContent></Card>{nextStatus && <Card><CardContent className="p-5"><h2 className="font-semibold">Próxima etapa</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Confirme somente quando esta fase realmente estiver concluída.</p><Button className="mt-4 w-full" disabled={updating} onClick={onAdvance}>{updating ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}Marcar como {statusLabel(nextStatus)}</Button></CardContent></Card>}</aside></div></main>; }
function EmptyState() { return <Card className="border-dashed"><CardContent className="p-10 text-center"><ShoppingBag className="mx-auto size-7 text-muted-foreground" /><h2 className="mt-4 text-lg font-bold">Nenhum pedido encontrado</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Os pedidos confirmados na vitrine aparecerão aqui, sempre separados pela loja ativa.</p></CardContent></Card>; }
function SelectFilter({ label, value, onChange, options }) { return <label className="space-y-2"><span className="text-xs font-semibold text-muted-foreground">{label}</span><select className="h-10 w-full rounded-lg border bg-card px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue || "all"} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function InfoPill({ label }) { return <span className="inline-flex w-fit rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>; }
function StatusPill({ status }) { const [label, className] = statusMeta[status] || [status, "bg-muted text-muted-foreground"]; return <span className={`inline-flex w-fit rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${className}`}>{label}</span>; }
function SummaryLine({ label, value, strong = false }) { return <div className="flex items-center justify-between gap-3 text-sm"><span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span><span className={strong ? "font-bold" : "font-medium"}>{value}</span></div>; }
function statusLabel(status) { return statusMeta[status]?.[0]?.toLowerCase() || status; }
function nextOrderStatus(status) { return ({ paid: "processing", paid_stock_exception: "processing", processing: "shipped", shipped: "delivered" })[status] || ""; }
function Pagination({ pagination, onChange }) { if ((pagination?.total || 0) <= pagination?.limit) return null; return <div className="flex items-center justify-between py-5"><span className="text-sm text-muted-foreground">Página {pagination.page} de {pagination.totalPages}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)}>Anterior</Button><Button type="button" variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => onChange(pagination.page + 1)}>Próxima</Button></div></div>; }
