const STORE_KEY = "ld_store";

export function readActiveStoreCache() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || sessionStorage.getItem(STORE_KEY) || "null");
  } catch {
    clearActiveStoreCache();
    return null;
  }
}

export function persistActiveStore(store) {
  const serialized = JSON.stringify(store);
  localStorage.setItem(STORE_KEY, serialized);
  sessionStorage.setItem(STORE_KEY, serialized);
}

export function clearActiveStoreCache() {
  localStorage.removeItem(STORE_KEY);
  sessionStorage.removeItem(STORE_KEY);
}
