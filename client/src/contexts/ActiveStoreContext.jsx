/** Estado compartilhado da loja ativa para manter navegação e conteúdo do aplicativo sincronizados. */
import { createContext, useContext } from "react";

export const ActiveStoreContext = createContext({ store: null, stores: [], chooseStore: () => undefined });

export function useActiveStore() {
  return useContext(ActiveStoreContext);
}
