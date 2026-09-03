export function publicStorePath(slug, suffix = "") {
  const normalizedSlug = String(slug || "").trim();
  const normalizedSuffix = String(suffix || "").trim();
  return `/@${encodeURIComponent(normalizedSlug)}${normalizedSuffix ? `/${normalizedSuffix.replace(/^\/+/, "")}` : ""}`;
}

export function resolvePublicStoreUrl({ slug, location = window.location } = {}) {
  const current = new URL(location.href || `${location.origin}${location.pathname || "/"}`);
  const currentPrefix = publicStorePath(slug);
  const currentPath = current.pathname;
  const pathname = currentPath === currentPrefix || currentPath.startsWith(`${currentPrefix}/`)
    ? currentPath
    : publicStorePath(slug);
  return `${current.origin}${pathname}${current.search}`;
}
