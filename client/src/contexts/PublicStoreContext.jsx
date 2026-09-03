import { createContext, useContext, useMemo } from "react";
import { publicThemeStyle, selectPublicStorePresentation } from "@/domain/store-contract/presentation";

const PublicStoreContext = createContext(null);

export function PublicStoreProvider({ domain, children }) {
  const presentation = useMemo(() => selectPublicStorePresentation(domain), [domain]);
  const value = useMemo(() => ({
    domain,
    presentation,
    store: domain.store,
    locale: presentation.locale,
    currency: presentation.currency,
    theme: presentation.theme,
    capabilities: presentation.capabilities,
  }), [domain, presentation]);
  const style = useMemo(() => publicThemeStyle(presentation.theme), [presentation.theme]);

  return <PublicStoreContext.Provider value={value}>
    <div key={`${presentation.storeId}:${presentation.slug}`} className="public-storefront min-h-screen bg-[var(--store-background)] text-[var(--store-text)]" data-public-store-id={presentation.storeId} data-public-store-slug={presentation.slug} style={style}>
      {children}
    </div>
  </PublicStoreContext.Provider>;
}

export function usePublicStore() {
  const context = useContext(PublicStoreContext);
  if (!context) throw new Error("usePublicStore deve ser usado dentro de PublicStoreProvider.");
  return context;
}
