export class StoreValidationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function parseStoreIdentity(source = {}, existing = {}) {
  const suppliedColor = source.color;
  const suppliedAddressMode = source.addressMode;
  const color = suppliedColor === undefined
    ? existing.color || "#FF32B2"
    : String(suppliedColor).toUpperCase();
  const addressMode = suppliedAddressMode === undefined
    ? existing.address_mode || existing.addressMode || "slug"
    : String(suppliedAddressMode);

  if (!/^#[0-9A-F]{6}$/.test(color)) {
    throw new StoreValidationError(422, "Informe uma cor hexadecimal válida.");
  }
  if (!["slug", "custom_domain"].includes(addressMode)) {
    throw new StoreValidationError(422, "Informe um modo de endereço válido.");
  }

  const suppliedCategory = source.storeCategory;
  const storeCategory = suppliedCategory === undefined
    ? (existing.store_category || existing.storeCategory || "")
    : String(suppliedCategory || "").trim().slice(0, 80);

  return { color, addressMode, storeCategory };
}
