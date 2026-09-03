import { routeIdentifier } from "@/lib/route-params";

function locationText(location) {
  return String(location || "").split("?")[0].replace(/\/$/, "") || "/";
}

export function parseAdminEntityRoute(location, { basePath, identifierKey }) {
  const path = locationText(location);
  if (path === `${basePath}/create`) return { kind: "create", key: path };
  const editMatch = path.match(new RegExp(`^${escapePath(basePath)}/([^/]+)/edit$`));
  const editId = routeIdentifier(editMatch?.[1]);
  if (editMatch && editId) return { kind: "edit", [identifierKey]: editId, key: path };
  const viewMatch = path.match(new RegExp(`^${escapePath(basePath)}/([^/]+)$`));
  const viewId = routeIdentifier(viewMatch?.[1]);
  return viewMatch && viewId ? { kind: "view", [identifierKey]: viewId, key: path } : { kind: "list", key: path };
}

export function parseProductManagementRoute(location) {
  const path = locationText(location);
  if (path === "/products/categories/create") return { kind: "categories", categoryAction: "create", key: path };
  const categoryEdit = path.match(/^\/products\/categories\/([^/]+)\/edit$/);
  const categoryId = routeIdentifier(categoryEdit?.[1]);
  if (categoryEdit && categoryId) return { kind: "categories", categoryAction: "edit", categoryId, key: path };
  if (path === "/products/categories") return { kind: "categories", key: path };
  return parseAdminEntityRoute(path, { basePath: "/products", identifierKey: "productId" });
}

function escapePath(path) {
  return String(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
