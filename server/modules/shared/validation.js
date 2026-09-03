export function normalizeEmail(value) { const email = String(value || "").trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""; }
export function normalizeSlug(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120); }
export function validText(value, min, max) { const text = String(value || "").trim(); return text.length >= min && text.length <= max ? text : ""; }
export function optionalEmail(value) { const email = String(value || "").trim().toLowerCase(); return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""; }
export function optionalUrl(value) { const text = String(value || "").trim(); if (!text) return ""; try { const url = new URL(text); return ["http:", "https:"].includes(url.protocol) ? url.toString() : ""; } catch { return ""; } }
