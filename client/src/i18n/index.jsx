import { createContext, useContext, useMemo, useState } from "react";
import { catalogs, locale as defaultLocale, ptBR, resolveTranslation } from "./pt-BR";

const I18nContext = createContext({ locale: defaultLocale, t: resolveTranslation, setLocale: () => undefined });

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem("ld_locale") || defaultLocale);
  const value = useMemo(() => {
    const messages = catalogs[locale] || ptBR;
    return { locale, messages, setLocale: (nextLocale) => { localStorage.setItem("ld_locale", nextLocale); setLocale(nextLocale); }, t: (path, variables = {}) => { const value = resolveTranslation(path, messages); return typeof value === "string" ? value.replace(/\{(\w+)\}/g, (_match, key) => variables[key] ?? `{${key}}`) : value; } };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }
