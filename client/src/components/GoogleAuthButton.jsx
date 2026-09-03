import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function GoogleAuthButton() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (typeof api.googleAuthStatus !== "function") { setLoading(false); return; } api.googleAuthStatus().then((status) => setEnabled(Boolean(status.enabled))).catch(() => setEnabled(false)).finally(() => setLoading(false)); }, []);
  if (loading || !enabled) return null;
  return <><Button type="button" variant="outline" className="w-full" onClick={() => window.location.assign("/v1/auth/google")}><span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-white text-xs font-black text-[#4285F4] shadow-sm">G</span>Continuar com Google</Button><div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div></>;
}

export function GoogleCallbackLoader({ onComplete }) {
  const [error, setError] = useState("");
  useEffect(() => { const params = new URLSearchParams(window.location.search); const token = params.get("google_token"); if (!token) return; try { const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); localStorage.setItem("ld_token", token); localStorage.setItem("ld_user", JSON.stringify({ id: payload.id, name: payload.name, email: payload.email })); window.history.replaceState({}, document.title, "/login"); onComplete(payload); } catch { setError("Não foi possível concluir o login com Google. Tente novamente."); } }, [onComplete]); if (!new URLSearchParams(window.location.search).get("google_token")) return null; return <div className="mb-5 flex items-center justify-center gap-2 rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">{error ? error : <><LoaderCircle className="size-4 animate-spin" />Concluindo acesso com Google…</>}</div>;
}
