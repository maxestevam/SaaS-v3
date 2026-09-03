import { resolvePublicStoreUrl } from "@/lib/public-store-url";

const MANAGED_ATTRIBUTE = "data-public-store-managed";

export function applyPublicStoreMetadata(shell, page = {}, location = window.location, documentRef = document) {
  const title = page.seo?.title || page.title || shell.store.seo.title || shell.store.name;
  const description = page.seo?.description || shell.store.seo.description || shell.store.description || "";
  const ogImage = page.seo?.ogImageUrl || shell.store.seo.ogImageUrl || shell.store.logoUrl || "";
  const canonicalUrl = resolvePublicStoreUrl({ slug: shell.store.slug, location });
  const snapshot = captureMetadata(documentRef);

  documentRef.title = title;
  upsertMeta(documentRef, "name", "description", description);
  upsertMeta(documentRef, "property", "og:title", title);
  upsertMeta(documentRef, "property", "og:description", description);
  syncOptionalMeta(documentRef, "property", "og:image", ogImage);
  upsertMeta(documentRef, "property", "og:url", canonicalUrl);
  upsertCanonical(documentRef, canonicalUrl);
  syncFavicon(documentRef, shell.store.faviconUrl || "");

  return () => restoreMetadata(documentRef, snapshot);
}

function captureMetadata(documentRef) {
  return {
    title: documentRef.title,
    description: captureNode(documentRef, 'meta[name="description"]'),
    ogTitle: captureNode(documentRef, 'meta[property="og:title"]'),
    ogDescription: captureNode(documentRef, 'meta[property="og:description"]'),
    ogImage: captureNode(documentRef, 'meta[property="og:image"]'),
    ogUrl: captureNode(documentRef, 'meta[property="og:url"]'),
    canonical: captureNode(documentRef, 'link[rel="canonical"]'),
  };
}

function captureNode(documentRef, selector) {
  const node = documentRef.head.querySelector(selector);
  return node ? { exists: true, content: node.getAttribute("content"), href: node.getAttribute("href"), managed: node.getAttribute(MANAGED_ATTRIBUTE) } : { exists: false };
}

function restoreMetadata(documentRef, snapshot) {
  documentRef.title = snapshot.title;
  restoreNode(documentRef, 'meta[name="description"]', snapshot.description, "content");
  restoreNode(documentRef, 'meta[property="og:title"]', snapshot.ogTitle, "content");
  restoreNode(documentRef, 'meta[property="og:description"]', snapshot.ogDescription, "content");
  restoreNode(documentRef, 'meta[property="og:image"]', snapshot.ogImage, "content");
  restoreNode(documentRef, 'meta[property="og:url"]', snapshot.ogUrl, "content");
  restoreNode(documentRef, 'link[rel="canonical"]', snapshot.canonical, "href");
  documentRef.head.querySelectorAll(`link[rel="icon"][${MANAGED_ATTRIBUTE}]`).forEach((node) => node.remove());
}

function restoreNode(documentRef, selector, snapshot, attribute) {
  const node = documentRef.head.querySelector(selector);
  if (!snapshot.exists) {
    if (node?.getAttribute(MANAGED_ATTRIBUTE) === "true") node.remove();
    return;
  }
  if (!node) return;
  node.setAttribute(attribute, snapshot[attribute] || "");
  if (snapshot.managed) node.setAttribute(MANAGED_ATTRIBUTE, snapshot.managed);
  else node.removeAttribute(MANAGED_ATTRIBUTE);
}

function upsertMeta(documentRef, attribute, key, content) {
  let node = documentRef.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!node) { node = documentRef.createElement("meta"); node.setAttribute(attribute, key); documentRef.head.appendChild(node); }
  node.setAttribute(MANAGED_ATTRIBUTE, "true");
  node.setAttribute("content", content || "");
}

function syncOptionalMeta(documentRef, attribute, key, content) {
  const selector = `meta[${attribute}="${key}"]`;
  if (!content) {
    const node = documentRef.head.querySelector(selector);
    if (node?.getAttribute(MANAGED_ATTRIBUTE) === "true") node.remove();
    return;
  }
  upsertMeta(documentRef, attribute, key, content);
}

function upsertCanonical(documentRef, href) {
  let node = documentRef.head.querySelector('link[rel="canonical"]');
  if (!node) { node = documentRef.createElement("link"); node.setAttribute("rel", "canonical"); documentRef.head.appendChild(node); }
  node.setAttribute(MANAGED_ATTRIBUTE, "true");
  node.setAttribute("href", href);
}

function syncFavicon(documentRef, href) {
  documentRef.head.querySelectorAll(`link[rel="icon"][${MANAGED_ATTRIBUTE}]`).forEach((node) => node.remove());
  if (!href) return;
  const node = documentRef.createElement("link");
  node.setAttribute("rel", "icon");
  node.setAttribute(MANAGED_ATTRIBUTE, "true");
  node.setAttribute("href", href);
  documentRef.head.appendChild(node);
}
