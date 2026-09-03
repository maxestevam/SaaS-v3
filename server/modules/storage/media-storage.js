/** Provider de objetos de mídia exclusivo para Cloudflare R2. */
import { DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
const R2_PROVIDER = "r2";

export function getProductStorage() {
  const provider = String(process.env.STORAGE_PROVIDER || R2_PROVIDER).trim().toLowerCase();
  if (provider === R2_PROVIDER) return r2Storage;
  throw new Error("O armazenamento de mídia deve usar Cloudflare R2.");
}

export function getContractStorage() { return contractStorage; }

export function isSafeStorageKey(key) {
  return /^[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]{1,128}\/(?:products\/[A-Za-z0-9_-]{1,128}\/(?:images|video)\/[A-Za-z0-9_-]{1,128}\.(?:jpe?g|png|webp|mp4|webm)|banners\/[A-Za-z0-9_-]{1,128}\/(?:desktop|mobile)\/[A-Za-z0-9_-]{1,128}\.(?:jpe?g|png|webp)|store\/(?:logo|images)\/[A-Za-z0-9_-]{1,128}\.(?:jpe?g|png|webp))$/i.test(String(key || ""));
}

function segment(value, label) {
  const normalized = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(normalized)) throw new Error(`${label} de mídia inválido.`);
  return normalized;
}

export function productMediaKey({ accountId, storeId, draftId, folder, assetId, extension }) {
  return `${segment(accountId, "Conta")}/${segment(storeId, "Loja")}/products/${segment(draftId, "Rascunho")}/${segment(folder, "Pasta")}/${segment(assetId, "Arquivo")}.${segment(extension, "Extensão")}`;
}

export function bannerMediaKey({ accountId, storeId, bannerId, breakpoint, assetId, extension }) {
  return `${segment(accountId, "Conta")}/${segment(storeId, "Loja")}/banners/${segment(bannerId, "Banner")}/${segment(breakpoint, "Versão")}/${segment(assetId, "Arquivo")}.${segment(extension, "Extensão")}`;
}

export function storeMediaKey({ accountId, storeId, kind = "logo", assetId, extension }) {
  return `${segment(accountId, "Conta")}/${segment(storeId, "Loja")}/store/${segment(kind, "Tipo")}/${segment(assetId, "Arquivo")}.${segment(extension, "Extensão")}`;
}

export function storeMediaPrefix({ accountId, storeId }) {
  return `${segment(accountId, "Conta")}/${segment(storeId, "Loja")}/`;
}

const r2Storage = {
  async put({ key, body, contentType }) {
    if (!isSafeStorageKey(key)) throw new Error("Chave de armazenamento inválida.");
    const client = getR2Client();
    const bucket = requiredEnv("R2_BUCKET");
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    const publicBase = requiredEnv("R2_PUBLIC_URL").replace(/\/+$/, "");
    return { key, url: `${publicBase}/${key}` };
  },
  async remove(key) {
    if (!isSafeStorageKey(key)) return;
    await getR2Client().send(new DeleteObjectCommand({ Bucket: requiredEnv("R2_BUCKET"), Key: key }));
  },
  async removeMany(keys) {
    const uniqueKeys = [...new Set((keys || []).filter(isSafeStorageKey))];
    if (!uniqueKeys.length) return;
    const client = getR2Client();
    const bucket = requiredEnv("R2_BUCKET");
    for (let index = 0; index < uniqueKeys.length; index += 1000) {
      const objects = uniqueKeys.slice(index, index + 1000).map((Key) => ({ Key }));
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }));
    }
  },
  async listPrefix(prefix) {
    if (!isSafeStoragePrefix(prefix)) return [];
    const client = getR2Client();
    const bucket = requiredEnv("R2_BUCKET");
    const keys = [];
    let continuationToken;
    do {
      const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken }));
      keys.push(...(listed.Contents || []).map((item) => item.Key).filter(isSafeStorageKey));
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
    return keys;
  },
  async removePrefix(prefix) {
    await this.removeMany(await this.listPrefix(prefix));
  },
};

const contractStorage = {
  async putJson({ key, value }) {
    if (!isSafeContractKey(key)) throw new Error("Chave de contrato inválida.");
    await getR2Client().send(new PutObjectCommand({ Bucket: requiredEnv("R2_BUCKET"), Key: key, Body: JSON.stringify(value, null, 2), ContentType: "application/json; charset=utf-8", CacheControl: "no-cache" }));
    return { key };
  },
  async remove(key) {
    if (!isSafeContractKey(key)) return;
    await getR2Client().send(new DeleteObjectCommand({ Bucket: requiredEnv("R2_BUCKET"), Key: key }));
  },
  async removeMany(keys) { await Promise.all([...new Set(keys || [])].filter(isSafeContractKey).map((key) => this.remove(key))); },
};

function isSafeStoragePrefix(prefix) {
  return /^[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]{1,128}\/$/.test(String(prefix || ""));
}
function isSafeContractKey(key) { return /^stores\/[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.json$/i.test(String(key || "")); }

let r2Client;
function getR2Client() {
  if (r2Client) return r2Client;
  const endpoint = process.env.R2_ENDPOINT || `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
  r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"), secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY") },
  });
  return r2Client;
}

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`A configuração ${name} é obrigatória para este provider.`);
  return value;
}
