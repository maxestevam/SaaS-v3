export function decodeRouteSegment(value) {
  try {
    const decoded = decodeURIComponent(String(value || "")).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

export function publicSlug(value) {
  const slug = decodeRouteSegment(value);
  return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

export function routeIdentifier(value) {
  const identifier = decodeRouteSegment(value);
  return identifier && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(identifier) ? identifier : null;
}

export function routeQueryValue(search, key, maximum = 120) {
  try {
    const value = new URLSearchParams(String(search || "")).get(key);
    const normalized = String(value || "").trim();
    return normalized.length <= maximum ? normalized : "";
  } catch {
    return "";
  }
}
