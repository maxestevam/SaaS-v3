import * as repository from "./repository.js";
import { getStoreContract } from "./service.js";
import { getContractStorage } from "../storage/media-storage.js";

export async function syncStoreContractToR2({ storeId, userId, previousKeys = [] }) {
  const contract = await getStoreContract({ storeId, userId, dataSource: repository });
  const key = storeContractKey(contract.store);
  await getContractStorage().putJson({ key, value: contract });
  const obsolete = [...new Set(previousKeys.filter((item) => item && item !== key))];
  if (obsolete.length) await getContractStorage().removeMany(obsolete);
  return { key, contract };
}

export async function removeStoreContractFromR2({ key }) {
  if (key) await getContractStorage().remove(key);
}

export function storeContractKey(store) {
  const domain = String(store?.customDomain || store?.custom_domain || "").trim().toLowerCase();
  const slug = String(store?.slug || "").trim().toLowerCase();
  const basename = domain || slug;
  if (!/^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/.test(basename)) throw new Error("Slug ou domínio inválido para gerar o JSON da loja.");
  return `stores/${basename}.json`;
}
