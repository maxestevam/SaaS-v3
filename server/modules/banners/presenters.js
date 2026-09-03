const PAGES = ["home", "categories", "products"];

export function publicImage(row) {
  return {
    id: row.id,
    bannerId: row.banner_id || row.bannerId,
    stagedUploadId: row.staged_upload_id || row.stagedUploadId || undefined,
    breakpoint: row.breakpoint,
    url: row.url,
    width: Number(row.width),
    height: Number(row.height),
    cropX: Number(row.crop_x ?? row.cropX ?? 50),
    cropY: Number(row.crop_y ?? row.cropY ?? 50),
    cropZoom: Number(row.crop_zoom ?? row.cropZoom ?? 1),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    active: row.active === undefined || row.active === null ? true : Boolean(row.active),
    createdAt: Number(row.created_at ?? row.createdAt ?? 0),
  };
}

export function publicBanner(row, images = []) {
  return {
    id: row.id,
    storeId: row.store_id || row.storeId,
    bannerKind: row.banner_kind || row.bannerKind || "hero",
    title: row.title,
    subtitle: row.subtitle || "",
    targetUrl: row.target_url || row.targetUrl || "",
    buttonText: row.button_text || row.buttonText || "",
    pages: unique(parseJson(row.pages, []), PAGES),
    categoryIds: unique(parseJson(row.category_ids, []), null),
    position: row.display_position || row.position,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    active: Boolean(row.active),
    images: images.map(publicImage),
    createdAt: Number(row.created_at ?? row.createdAt ?? 0),
    updatedAt: Number(row.updated_at ?? row.updatedAt ?? 0),
  };
}

function parseJson(value, fallback) {
  try { return typeof value === "string" ? JSON.parse(value) : value || fallback; } catch { return fallback; }
}

function unique(value, allowed) {
  const values = Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const validUuid = (item) => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(item);
  return [...new Set(allowed ? values.filter((item) => allowed.includes(item)) : values.filter(validUuid))];
}
