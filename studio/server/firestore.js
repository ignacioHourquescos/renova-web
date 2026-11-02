import { assertSlug } from "../shared/content.js";
import { accessToken, cloudError } from "./google-auth.js";
import { loadPack, writePackLandings, writePackSite } from "./store.js";

const PROJECT = "renova-landing";
const STATS_COLLECTION = "landings_statistics_dev";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let cloudReady = false;
let syncing = null;

async function api(method, resource, body) {
  const token = await accessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/${resource}`;
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw cloudError("No se pudo conectar con Firestore.");
  }
  if (response.status === 404) return null;
  const text = await response.text();
  if (!response.ok) {
    let detail = "No se pudo guardar en Firestore.";
    try {
      const parsed = JSON.parse(text);
      if (parsed.error && parsed.error.message) detail = `No se pudo guardar en Firestore. ${parsed.error.message}`;
    } catch {
      detail = "No se pudo guardar en Firestore.";
    }
    throw cloudError(detail);
  }
  return text ? JSON.parse(text) : {};
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === "object") return { mapValue: { fields: encodeFields(value) } };
  return { stringValue: String(value) };
}

function encodeFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (value === undefined) continue;
    fields[key] = encodeValue(value);
  }
  return fields;
}

function decodeValue(value) {
  if (!value || typeof value !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) return value.booleanValue;
  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) return value.doubleValue;
  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) return null;
  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) return value.timestampValue;
  if (Object.prototype.hasOwnProperty.call(value, "arrayValue")) {
    const values = value.arrayValue && value.arrayValue.values;
    return Array.isArray(values) ? values.map(decodeValue) : [];
  }
  if (Object.prototype.hasOwnProperty.call(value, "mapValue")) {
    return decodeFields(value.mapValue && value.mapValue.fields);
  }
  return null;
}

function decodeFields(fields) {
  const data = {};
  for (const [key, value] of Object.entries(fields || {})) data[key] = decodeValue(value);
  return data;
}

function docId(name) {
  const parts = String(name || "").split("/");
  return parts[parts.length - 1] || "";
}

async function listCollection(collection) {
  const documents = [];
  let pageToken = "";
  do {
    const query = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const data = await api("GET", `documents/${collection}?pageSize=200${query}`);
    if (!data) break;
    if (Array.isArray(data.documents)) documents.push(...data.documents);
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return documents;
}

async function writeDocument(docPath, data) {
  const name = `projects/${PROJECT}/databases/(default)/documents/${docPath}`;
  await api("POST", "documents:commit", {
    writes: [{ update: { name, fields: encodeFields(data) } }],
  });
}

function landingPayload(landing) {
  const hero = landing.hero || {};
  const payload = {
    slug: landing.slug,
    brief: landing.brief || "",
    whatsapp: landing.whatsapp || "",
    whatsappMessage: landing.whatsappMessage || "",
    adsConversion: landing.adsConversion || "",
    hero: {
      eyebrow: hero.eyebrow || "",
      heading: hero.heading || "",
      subhead: hero.subhead || "",
      ctaLabel: hero.ctaLabel || "",
      ctaHref: hero.ctaHref || "",
      backgroundImage: hero.backgroundImage || "",
    },
    sections: landing.sections || {},
    updatedAt: new Date().toISOString(),
  };
  if (Array.isArray(landing.destacados)) {
    payload.destacados = landing.destacados.map((item) => {
      if (!item || typeof item !== "object") return item;
      const next = { ...item };
      delete next.imageDataUrl;
      return next;
    });
  }
  if (Array.isArray(landing.faq)) payload.faq = landing.faq;
  const libre = landing.libre && typeof landing.libre === "object" ? landing.libre : {};
  payload.libre = {
    heading: libre.heading || "",
    text: libre.text || "",
    cards: Array.isArray(libre.cards)
      ? libre.cards.map((card) => ({ title: card.title || "", text: card.text || "" }))
      : [],
  };
  const cotizar = landing.cotizar && typeof landing.cotizar === "object" ? landing.cotizar : {};
  const steps = Array.isArray(cotizar.steps) ? cotizar.steps : [];
  payload.cotizar = {
    heading: cotizar.heading || "",
    lead: cotizar.lead || "",
    steps: [0, 1, 2].map((index) => ({
      title: (steps[index] && steps[index].title) || "",
      text: (steps[index] && steps[index].text) || "",
    })),
  };
  const carousel = landing.carousel && typeof landing.carousel === "object" ? landing.carousel : {};
  const slides = Array.isArray(carousel.slides) ? carousel.slides : [];
  payload.carousel = {
    eyebrow: carousel.eyebrow || "",
    line1: carousel.line1 || "",
    line1Muted: carousel.line1Muted || "",
    slides: slides.map((slide) => ({
      id: slide.id || "",
      label: slide.label || "",
      text: slide.text || "",
      href: slide.href || "",
      image: slide.image || "",
    })),
  };
  if (Array.isArray(landing.clients)) {
    payload.clients = landing.clients.map((logo) => ({
      id: logo.id || "",
      alt: logo.alt || "",
      file: logo.file || "",
    }));
  }
  return payload;
}

async function writeLanding(landing) {
  assertSlug(landing.slug);
  await writeDocument(`landings/${landing.slug}`, landingPayload(landing));
}

function requireCloud() {
  if (!cloudReady) {
    throw cloudError("Firestore no está listo. Recargá el estudio y volvé a guardar.");
  }
}

async function runSync() {
  const remoteDocs = await listCollection("landings");
  const remote = [];
  for (const doc of remoteDocs) {
    const id = docId(doc.name);
    if (!SLUG.test(id)) continue;
    const data = decodeFields(doc.fields);
    if (!data.hero || typeof data.hero !== "object") continue;
    data.slug = id;
    delete data.updatedAt;
    remote.push(data);
  }

  const pack = loadPack();
  if (!remote.length) {
    for (const landing of pack.landings) await writeLanding(landing);
    await writeDocument("site/renova", { ...pack.site, updatedAt: new Date().toISOString() });
    await ensureAllLandingStats(pack.landings.map((landing) => landing.slug).concat("alta"));
    cloudReady = true;
    return;
  }

  const normalized = writePackLandings(remote);
  const remoteSlugs = new Set(normalized.map((landing) => landing.slug));
  const extras = pack.landings.filter((landing) => !remoteSlugs.has(landing.slug));
  for (const landing of extras) await writeLanding(landing);
  if (extras.length) writePackLandings(normalized.concat(extras));

  const siteDoc = await api("GET", "documents/site/renova");
  if (!siteDoc || !siteDoc.fields) {
    await writeDocument("site/renova", { ...loadPack().site, updatedAt: new Date().toISOString() });
  } else {
    const site = decodeFields(siteDoc.fields);
    delete site.updatedAt;
    writePackSite(site);
  }
  await ensureAllLandingStats(loadPack().landings.map((landing) => landing.slug).concat("alta"));
  cloudReady = true;
}

export function syncFromCloud({ force = false } = {}) {
  if (!force && cloudReady) return Promise.resolve();
  if (syncing) return syncing;
  const run = runSync().finally(() => {
    if (syncing === run) syncing = null;
  });
  syncing = run;
  return run;
}

export async function pushLandingDoc(landing) {
  requireCloud();
  await writeLanding(landing);
}

export async function pushSiteDoc(site) {
  requireCloud();
  await writeDocument("site/renova", { ...site, updatedAt: new Date().toISOString() });
}

async function ensureLandingStats(slug) {
  assertSlug(slug);
  const existing = await api("GET", `documents/${STATS_COLLECTION}/${slug}`);
  if (existing && existing.fields) return;
  await writeDocument(`${STATS_COLLECTION}/${slug}`, {
    slug,
    visits: 0,
    wppClicks: 0,
  });
}

export function ensureAllLandingStats(slugs) {
  return Promise.all(slugs.map((slug) => ensureLandingStats(slug)));
}

export async function readLandingStats() {
  const documents = await listCollection(STATS_COLLECTION);
  const stats = {};
  for (const doc of documents) {
    const id = docId(doc.name);
    if (!SLUG.test(id)) continue;
    const data = decodeFields(doc.fields);
    stats[id] = {
      visits: Number(data.visits) || 0,
      wppClicks: Number(data.wppClicks) || 0,
    };
  }
  return stats;
}

export async function deleteLandingDoc(slug) {
  requireCloud();
  assertSlug(slug);
  await api("DELETE", `documents/landings/${slug}`);
  await api("DELETE", `documents/${STATS_COLLECTION}/${slug}`);
}

export async function deleteLooseLanding(id) {
  if (!/^[A-Za-z0-9]+$/.test(id)) throw cloudError("Id inválido");
  await api("DELETE", `documents/landings/${id}`);
}
