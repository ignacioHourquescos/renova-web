async function request(url, options) {
  let response;
  try {
    response = await fetch(url, { cache: "no-store", ...options });
  } catch {
    throw new Error("No se pudo conectar con el estudio");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo completar la acción");
  return data;
}

export function getSite() {
  return request("/api/site");
}

export function getDestacados() {
  return request("/api/destacados");
}

export function createLanding(slug) {
  return request("/api/landings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug }),
  });
}

export function saveSiteClients(clients, options = {}) {
  const body = JSON.stringify({ clients });
  const keepalive = Boolean(options.keepalive) && body.length < 60000;
  return request("/api/site/clients", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
    keepalive,
  });
}

export function saveSiteFooter(footer, options = {}) {
  const body = JSON.stringify({ footer });
  const keepalive = Boolean(options.keepalive) && body.length < 60000;
  return request("/api/site/footer", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
    keepalive,
  });
}

export function saveLanding(slug, hero, imageDataUrl, options = {}) {
  const payload = { hero, imageDataUrl: imageDataUrl || "" };
  if (Object.prototype.hasOwnProperty.call(options, "destacados")) {
    payload.destacados = options.destacados;
  }
  if (Object.prototype.hasOwnProperty.call(options, "faq")) {
    payload.faq = options.faq;
  }
  if (Object.prototype.hasOwnProperty.call(options, "libre")) {
    payload.libre = options.libre;
  }
  if (Object.prototype.hasOwnProperty.call(options, "cotizar")) {
    payload.cotizar = options.cotizar;
  }
  if (Object.prototype.hasOwnProperty.call(options, "carousel")) {
    payload.carousel = options.carousel;
  }
  if (Object.prototype.hasOwnProperty.call(options, "clients")) {
    payload.clients = options.clients;
  }
  if (Object.prototype.hasOwnProperty.call(options, "sections")) {
    payload.sections = options.sections;
  }
  if (Object.prototype.hasOwnProperty.call(options, "brief")) {
    payload.brief = options.brief;
  }
  const body = JSON.stringify(payload);
  const keepalive = Boolean(options.keepalive) && body.length < 60000;
  return request(`/api/landings/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
    keepalive,
  });
}

export function saveLandingBrief(slug, brief) {
  return request(`/api/landings/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ brief }),
  });
}

export function saveLandingPatch(slug, patch) {
  return request(`/api/landings/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function saveAlta(patch) {
  return request("/api/alta", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function getTerms(slug) {
  return request(`/api/landings/${encodeURIComponent(slug)}/terms`);
}

export function proposeTerms(slug, text) {
  return request(`/api/landings/${encodeURIComponent(slug)}/terms/propose`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export function applyTerms(slug, fields, terms) {
  return request(`/api/landings/${encodeURIComponent(slug)}/terms/apply`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fields, terms }),
  });
}

export function deleteLanding(slug) {
  return request(`/api/landings/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

export function exportSite() {
  return request("/api/export", { method: "POST" });
}

export function publishSite() {
  return request("/api/publish", { method: "POST" });
}

export function mediaUrl(backgroundImage, version) {
  if (!backgroundImage) return "";
  return `/api/media/${backgroundImage}?v=${version}`;
}
