import { fail } from "./content.js";

export const DESTACADOS_COUNT = 8;

/** Misma agrupación comercial que usa renova-order-manager (`agru` → marca). */
const AGRUPACION = {
  48: "EAM",
  1: "FRAM",
  29: "KARBON",
  14: "LOCX",
  15: "MAHLE",
  9: "MANN",
  32: "ORIGINALES",
  8: "RAMA",
  22: "SAKURA",
  11: "WAGNER LOCKHEED",
  26: "WEGA",
  12: "MOTUL",
  3: "VALVOLINE",
  316: "PETRONAS",
  23: "OFERTAS FRAM",
  16: "OFERTAS KITS",
  4: "FILTROS VARIOS",
  19: "LUBRICANTES VARIOS",
  6: "UNION FILTER",
  7: "UNION JAPAN",
  5: "TOTAL",
  17: "HS",
  10: "TECNECO",
  27: "PUMA",
};

function clean(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function httpsUrl(value) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 2000) return "";
  try {
    const url = new URL(text);
    if (url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}

const PRODUCT_ID = /^[\p{L}\p{N} %()/.+_-]{1,80}$/u;
const CUSTOM_ID = /^c-[a-z0-9]{4,24}$/;
const CUSTOM_IMAGE = /^images\/destacados\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(c-[a-z0-9]{4,24})\.(jpg|png|webp)$/;
const DATA_IMAGE = /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=\r\n]+$/i;

export function destacadoCode(value) {
  const id = clean(value, 80);
  return PRODUCT_ID.test(id) ? id : "";
}

function productId(value) {
  return destacadoCode(value);
}

function codeKey(value) {
  return productId(value).toUpperCase();
}

function toCard(item, sectionName) {
  const source = item && typeof item === "object" ? item : {};
  const atributos = source.atributos && typeof source.atributos === "object" ? source.atributos : {};
  const code = productId(source.codigoArticulo);
  const id = code || productId(source.id);
  if (!id) return null;
  const title = clean(source.titulo, 140);
  const brand = clean(source.marca || sectionName, 40);
  const imageUrl = httpsUrl(source.imagenThumbUrl || source.imagenUrl);
  const badge = clean(atributos.graduacionNombre || atributos.graduacion, 16).toUpperCase();
  return { id, brand, title, code: code || id, imageUrl, badge };
}

function ofertaItems(payload) {
  const rows = [];
  for (const key of ["destacados", "otros"]) {
    const sections = Array.isArray(payload?.[key]) ? payload[key] : [];
    for (const section of sections) {
      const name = section?.seccionNombre || "";
      const items = Array.isArray(section?.items) ? section.items : [];
      for (const item of items) rows.push({ item, sectionName: name });
    }
  }
  const kits = Array.isArray(payload?.kits) ? payload.kits : [];
  for (const item of kits) rows.push({ item, sectionName: item?.marca || "" });
  return rows;
}

function mediaByCode(payload) {
  const media = new Map();
  for (const { item, sectionName } of ofertaItems(payload)) {
    const card = toCard(item, sectionName);
    if (!card?.imageUrl) continue;
    const key = codeKey(card.code);
    if (!key || media.has(key)) continue;
    media.set(key, card);
  }
  return media;
}

export function isCustomId(value) {
  return CUSTOM_ID.test(String(value || ""));
}

export function isCustomImage(slug, id, relative) {
  const match = CUSTOM_IMAGE.exec(String(relative || ""));
  return Boolean(match && match[1] === slug && match[2] === id);
}

export function customFields(value) {
  const source = value && typeof value === "object" ? value : {};
  const id = String(source.id || "");
  if (!isCustomId(id)) fail(400, "El producto propio tiene un identificador inválido");
  const title = clean(source.title, 140);
  const brand = clean(source.brand, 40);
  if (!title) fail(400, "El producto propio necesita una descripción");
  return { source: "custom", id, title, brand };
}

function dataImage(value) {
  const text = String(value || "");
  if (!DATA_IMAGE.test(text) || text.length > 12_000_000) return "";
  return text;
}

function remember(seen, key) {
  if (!key || seen.has(key)) return false;
  seen.add(key);
  return true;
}

/** Lista guardada: códigos de la API o productos propios con imagen ya escrita. */
export function normalizeDestacados(input, slug) {
  if (!Array.isArray(input)) return [];
  const items = [];
  const seen = new Set();
  for (const value of input) {
    if (items.length >= DESTACADOS_COUNT) break;
    if (typeof value === "string") {
      const id = productId(value);
      if (!remember(seen, codeKey(id))) continue;
      items.push(id);
      continue;
    }
    if (!value || typeof value !== "object" || value.source !== "custom") continue;
    const id = String(value.id || "");
    const title = clean(value.title, 140);
    const brand = clean(value.brand, 40);
    const image = String(value.image || "");
    if (!isCustomId(id) || !title || !isCustomImage(slug, id, image)) {
      fail(500, "Hay un destacado propio mal formado");
    }
    if (!remember(seen, codeKey(id))) continue;
    items.push({ source: "custom", id, title, brand, image });
  }
  return items;
}

export function normalizeDestacadoIds(input) {
  return normalizeDestacados(input).filter((item) => typeof item === "string");
}

/** Mezcla las secciones (una de cada marca por vuelta) y se queda con las primeras. */
export function pickDestacados(payload, limit = DESTACADOS_COUNT) {
  const sections = Array.isArray(payload?.destacados) ? payload.destacados : [];
  const lists = sections.map((section) => {
    const name = section?.seccionNombre || "";
    const items = Array.isArray(section?.items) ? section.items : [];
    return items.map((item) => toCard(item, name)).filter((card) => card && card.imageUrl && card.title);
  });
  const longest = Math.max(0, ...lists.map((list) => list.length));
  const picked = [];
  const seen = new Set();

  for (let round = 0; round < longest && picked.length < limit; round += 1) {
    for (const list of lists) {
      const card = list[round];
      if (!card || seen.has(card.id)) continue;
      seen.add(card.id);
      picked.push(card);
      if (picked.length >= limit) break;
    }
  }

  return picked;
}

export function catalogFromPayload(payload) {
  const sections = Array.isArray(payload?.destacados) ? payload.destacados : [];
  const seen = new Set();
  const catalog = [];
  for (const section of sections) {
    const name = section?.seccionNombre || "";
    const items = Array.isArray(section?.items) ? section.items : [];
    for (const card of items.map((item) => toCard(item, name))) {
      if (!card || !card.imageUrl || !card.title || seen.has(card.id)) continue;
      seen.add(card.id);
      catalog.push(card);
    }
  }
  return catalog;
}

/** Arma el catálogo desde el listado de artículos y le suma foto y marca de ofertas cuando el código coincide. */
export function catalogFromArticles(articles, ofertasPayload) {
  const media = mediaByCode(ofertasPayload);
  const seen = new Set();
  const catalog = [];
  for (const article of Array.isArray(articles) ? articles : []) {
    const id = productId(article?.id);
    const key = codeKey(id);
    if (!key || seen.has(key)) continue;
    const extra = media.get(key);
    const brand = clean(extra?.brand || AGRUPACION[String(article?.agru ?? "")] || "", 40);
    const title = clean(extra?.title || article?.d || id, 140);
    if (!title) continue;
    seen.add(key);
    catalog.push({
      id,
      brand,
      title,
      code: id,
      imageUrl: extra?.imageUrl || "",
      badge: extra?.badge || "",
      detail: clean(article?.da, 80),
    });
  }
  return catalog;
}

export function suggestDestacados(catalog, payload, limit = DESTACADOS_COUNT) {
  const byCode = new Map((Array.isArray(catalog) ? catalog : []).map((card) => [codeKey(card.id), card]));
  const suggested = [];
  for (const pick of pickDestacados(payload, Math.max(limit, 40))) {
    const card = byCode.get(codeKey(pick.code || pick.id));
    if (!card) continue;
    suggested.push(card);
    if (suggested.length >= limit) break;
  }
  return suggested;
}

export function resolveDestacados(catalog, items) {
  const byId = new Map();
  for (const card of Array.isArray(catalog) ? catalog : []) {
    byId.set(card.id, card);
    byId.set(codeKey(card.id), card);
  }
  const resolved = [];
  const seen = new Set();
  const list = Array.isArray(items) ? items : [];
  for (const value of list) {
    if (resolved.length >= DESTACADOS_COUNT) break;
    if (value && typeof value === "object" && value.source === "custom") {
      const id = String(value.id || "");
      const title = clean(value.title, 140);
      if (!isCustomId(id) || !title || !remember(seen, codeKey(id))) continue;
      const image = String(value.image || "");
      const match = CUSTOM_IMAGE.exec(image);
      resolved.push({
        id,
        brand: clean(value.brand, 40),
        title,
        code: "",
        imageUrl: dataImage(value.imageDataUrl),
        image: match && match[2] === id ? image : "",
        badge: "",
        source: "custom",
      });
      continue;
    }
    const id = productId(value);
    const card = byId.get(id) || byId.get(codeKey(id));
    if (!card || seen.has(card.id)) continue;
    seen.add(card.id);
    resolved.push(card);
  }
  return resolved;
}
