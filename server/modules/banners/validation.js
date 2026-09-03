const PAGES = ["home", "categories", "products"];
const POSITIONS = ["top", "middle", "after_row_1", "after_row_2", "after_row_3", "after_row_4", "final"];
const BREAKPOINTS = { desktop: { width: 1280, height: 360 }, mobile: { width: 750, height: 600 } };
const FORMATS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export class BannerValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 422;
  }
}

export function parseBannerInput(source = {}, existing = {}) {
  const title = cleanText(source.title === undefined ? existing.title ?? "Banner" : source.title, 1, 160);
  const pages = parseUnique(source.pages === undefined ? existing.pages : source.pages, PAGES);
  const categoryIds = parseUnique(source.categoryIds === undefined ? existing.category_ids : source.categoryIds, null);
  const position = String(source.position === undefined ? existing.display_position ?? "top" : source.position);
  const active = parseActive(source.active === undefined ? existing.active ?? true : source.active);
  const bannerKind = String(source.bannerKind === undefined ? existing.banner_kind ?? "hero" : source.bannerKind).trim();
  const subtitle = cleanText(source.subtitle === undefined ? existing.subtitle ?? "" : source.subtitle, 0, 300);
  const targetUrl = cleanTargetUrl(source.targetUrl === undefined ? existing.target_url ?? "" : source.targetUrl);
  const buttonText = cleanText(source.buttonText === undefined ? existing.button_text ?? "" : source.buttonText, 0, 80);
  const sortOrder = parseSortOrder(source.sortOrder === undefined ? existing.sort_order ?? 0 : source.sortOrder);
  const draftId = source.draftId === undefined ? "" : String(source.draftId || "").trim();
  const uploadIds = source.uploadIds === undefined ? [] : parseUnique(source.uploadIds, null);

  if (!title) throw new BannerValidationError("Informe um nome interno para o banner.");
  if (!Array.isArray(pages) || !Array.isArray(categoryIds)) throw new BannerValidationError("Informe páginas e categorias válidas para o banner.");
  if (!pages.length) throw new BannerValidationError("Selecione ao menos uma página para exibir o banner.");
  if (pages.includes("categories") && !categoryIds.length) throw new BannerValidationError("Selecione ao menos uma categoria para exibir o banner nessa página.");
  if (!POSITIONS.includes(position)) throw new BannerValidationError("Selecione uma posição válida para o banner.");
  if (active === null) throw new BannerValidationError("Informe se o banner está ativo.");
  if (!["hero", "mini"].includes(bannerKind)) throw new BannerValidationError("Selecione um tipo de banner válido.");
  if (targetUrl === false) throw new BannerValidationError("Informe um destino válido, começando por / ou https://.");
  if (sortOrder === null) throw new BannerValidationError("Informe uma ordem de vitrine válida.");
  if (draftId && !isUuid(draftId)) throw new BannerValidationError("Rascunho de banner inválido.");
  if (uploadIds === false) throw new BannerValidationError("Uploads de banner inválidos.");

  const input = { title, subtitle, targetUrl, buttonText, bannerKind, sortOrder, pages, categoryIds: pages.includes("categories") ? categoryIds : [], position, active };
  if (draftId || uploadIds.length) Object.assign(input, { draftId, uploadIds });
  return input;
}

function cleanTargetUrl(value) { const normalized = String(value || "").trim(); if (!normalized) return ""; if (normalized.startsWith("/") || /^https:\/\//i.test(normalized)) return normalized.slice(0, 600); return false; }
function parseSortOrder(value) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 && parsed <= 9999 ? parsed : null; }

export function parseBannerImagePatch(source = {}, existing = {}) {
  const crop = parseCrop(source, existing);
  const active = source.active === undefined ? Boolean(existing.active ?? true) : parseActive(source.active);
  if (active === null) throw new BannerValidationError("Informe se a imagem do banner está ativa.");
  return { crop, active };
}

export function getBannerMediaInput(body, file) {
  const breakpoint = String(body?.breakpoint || "");
  const requirement = BREAKPOINTS[breakpoint];
  if (!requirement || !file) throw new BannerValidationError("Envie uma imagem e selecione a versão desktop ou mobile.");
  const extension = FORMATS[file.mimetype];
  if (!extension || !validImageSignature(file.buffer, file.mimetype)) throw new BannerValidationError("Envie uma imagem JPG, PNG ou WebP válida.");
  return { breakpoint, requirement, extension, crop: parseCrop(body) };
}

export function assertMinimumDimensions(dimensions, requirement, breakpoint) {
  if (!dimensions.width || !dimensions.height || dimensions.width < requirement.width || dimensions.height < requirement.height) {
    throw new BannerValidationError(`A imagem ${breakpoint === "desktop" ? "desktop" : "mobile"} deve ter no mínimo ${requirement.width}×${requirement.height}px.`);
  }
}

function parseCrop(source = {}, existing = {}) {
  const number = (value, fallback, min, max) => {
    const parsed = value === undefined ? Number(fallback) : value === null ? NaN : Number(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? Number(parsed.toFixed(2)) : null;
  };
  const x = number(source.cropX, existing.crop_x ?? 50, 0, 100);
  const y = number(source.cropY, existing.crop_y ?? 50, 0, 100);
  const zoom = number(source.cropZoom, existing.crop_zoom ?? 1, 1, 3);
  if (x === null || y === null || zoom === null) throw new BannerValidationError("Ajuste de recorte ou zoom inválido.");
  return { x, y, zoom };
}

function validImageSignature(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  return false;
}

function parseUnique(value, allowed) {
  if (value === undefined || value === null || value === "") return [];
  let input = value;
  if (typeof input === "string") {
    try { input = JSON.parse(input); } catch { return false; }
  }
  if (!Array.isArray(input)) return false;
  const values = input.map((item) => String(item || "").trim()).filter(Boolean);
  const valid = allowed ? (item) => allowed.includes(item) : isUuid;
  return values.every(valid) ? [...new Set(values)] : false;
}

function parseActive(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return null;
}

function cleanText(value, min, max) {
  const text = String(value || "").trim();
  return text.length >= min && text.length <= max ? text : "";
}

function isUuid(value) {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(String(value || ""));
}
