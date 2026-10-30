import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSite,
  assertSlug,
  defaultCarousel,
  defaultCotizar,
  defaultFaq,
  defaultLibre,
  emptyHero,
  fail,
  isBuiltinClientFile,
  isLandingClientFile,
  isLegacyClientFile,
  isStoredCarouselImage,
  isStoredClientFile,
  normalizeCarousel,
  normalizeClients,
  normalizeCotizar,
  normalizeFaq,
  normalizeLibre,
  normalizeAdsConversion,
  normalizeAlta,
  normalizeBrief,
  normalizeFooter,
  normalizeHero,
  normalizeSections,
  normalizeWhatsapp,
  normalizeWhatsappMessage,
} from "../shared/content.js";
import { DESTACADOS_COUNT, customFields, destacadoCode, isCustomImage, normalizeDestacados } from "../shared/destacados.js";
import { CONSULTA_CONVERSION, applyWhatsappLink, whatsappDigits, whatsappText, withWhatsappPhone } from "../shared/tracking.js";

const studioRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error && error.status) throw error;
    fail(500, "No se pudo leer " + path.basename(file));
  }
}

function activeSiteId() {
  const config = readJson(path.join(studioRoot, "site.config.json"));
  const id = config && config.activeSite;
  assertSlug(id);
  return id;
}

export function loadPack() {
  const id = activeSiteId();
  const dir = path.join(studioRoot, "sites", id);
  if (!fs.existsSync(path.join(dir, "site.json"))) {
    fail(500, "No se encontró el paquete del sitio");
  }
  const site = assertSite(readJson(path.join(dir, "site.json")));
  const data = readJson(path.join(dir, "landings.json"));
  if (!data || !Array.isArray(data.landings)) {
    fail(500, "landings.json está mal formado");
  }
  const landings = data.landings.map(assertLanding);
  return { id, dir, site, landings };
}

function assertLanding(landing) {
  if (!landing || typeof landing !== "object") fail(500, "Hay una landing mal formada");
  assertSlug(landing.slug);
  const hero = landing.hero || {};
  const normalized = normalizeHero(hero);
  const backgroundImage = String(hero.backgroundImage ?? "");
  if (backgroundImage && !imagePathFor(landing.slug, backgroundImage)) {
    fail(500, `La imagen de ${landing.slug} no es válida`);
  }
  const whatsapp = Object.prototype.hasOwnProperty.call(landing, "whatsapp")
    ? normalizeWhatsapp(landing.whatsapp)
    : (whatsappDigits(normalized.ctaHref) || "");
  const adsConversion = Object.prototype.hasOwnProperty.call(landing, "adsConversion")
    ? normalizeAdsConversion(landing.adsConversion)
    : CONSULTA_CONVERSION;
  const whatsappMessage = Object.prototype.hasOwnProperty.call(landing, "whatsappMessage")
    ? normalizeWhatsappMessage(landing.whatsappMessage)
    : whatsappText(normalized.ctaHref);
  const result = {
    slug: landing.slug,
    brief: normalizeBrief(landing.brief || ""),
    whatsapp,
    whatsappMessage,
    adsConversion,
    hero: {
      ...normalized,
      backgroundImage,
      ctaHref: whatsapp ? withWhatsappPhone(normalized.ctaHref, whatsapp) : normalized.ctaHref,
    },
  };
  if (Array.isArray(landing.destacados)) {
    result.destacados = normalizeDestacados(landing.destacados, landing.slug);
  }
  if (Array.isArray(landing.faq)) {
    result.faq = normalizeFaq(landing.faq);
  }
  result.libre = normalizeLibre(landing.libre);
  result.cotizar = normalizeCotizar(landing.cotizar);
  const carousel = normalizeCarousel(landing.carousel, landing.slug);
  for (const slide of carousel.slides) {
    if (!slide.image || slide.imageDataUrl) fail(500, "Las imágenes del carrusel están mal guardadas");
  }
  result.carousel = {
    eyebrow: carousel.eyebrow,
    line1: carousel.line1,
    line1Muted: carousel.line1Muted,
    slides: carousel.slides.map((slide) => ({
      id: slide.id,
      label: slide.label,
      text: slide.text,
      href: slide.href,
      image: slide.image,
    })),
  };
  if (Array.isArray(landing.clients)) {
    const logos = normalizeClients(landing.clients, landing.slug);
    for (const logo of logos) {
      if (!logo.file || logo.imageDataUrl) fail(500, "Los iconos de clientes están mal guardados");
    }
    result.clients = logos.map((logo) => ({ id: logo.id, alt: logo.alt, file: logo.file }));
  }
  result.sections = normalizeSections(landing.sections);
  return result;
}

function imagePathFor(slug, relative) {
  const expected = new RegExp(`^images/${slug}\\.(jpg|png|webp)$`);
  return expected.test(relative);
}

function writeLandings(dir, landings) {
  const file = path.join(dir, "landings.json");
  fs.writeFileSync(file, JSON.stringify({ landings }, null, 2) + "\n");
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function landingBySlug(pack, slug) {
  assertSlug(slug);
  return pack.landings.find((landing) => landing.slug === slug) || null;
}

export function createLanding(slug) {
  assertSlug(slug);
  const pack = loadPack();
  if (landingBySlug(pack, slug)) fail(400, "Esa ruta ya existe");
  const landing = {
    slug,
    brief: "",
    whatsapp: "",
    whatsappMessage: "",
    adsConversion: "",
    hero: emptyHero(),
    faq: defaultFaq(),
    cotizar: defaultCotizar(),
    libre: defaultLibre(),
    carousel: defaultCarousel(),
  };
  const landings = pack.landings.concat(landing);
  writeLandings(pack.dir, landings);
  return landing;
}

export function deleteLanding(slug) {
  assertSlug(slug);
  const pack = loadPack();
  if (!landingBySlug(pack, slug)) fail(404, "No existe esa landing");
  const landings = pack.landings.filter((landing) => landing.slug !== slug);
  writeLandings(pack.dir, landings);
  for (const ext of ["jpg", "png", "webp"]) {
    const relative = `images/${slug}.${ext}`;
    const file = path.join(pack.dir, relative);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    removePublicImage(relative);
  }
  fs.rmSync(path.join(pack.dir, "images", "destacados", slug), { recursive: true, force: true });
  fs.rmSync(path.join(publicAssetsRoot(), "destacados", slug), { recursive: true, force: true });
  fs.rmSync(path.join(pack.dir, "images", "carousel", slug), { recursive: true, force: true });
  fs.rmSync(path.join(publicAssetsRoot(), "carousel", slug), { recursive: true, force: true });
  fs.rmSync(path.join(pack.dir, "images", "clients", slug), { recursive: true, force: true });
  fs.rmSync(path.join(publicAssetsRoot(), "clients", slug), { recursive: true, force: true });
}

function decodeImage(dataUrl, maxBytes = 8 * 1024 * 1024) {
  const match = /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=\r\n]+)$/i.exec(dataUrl || "");
  if (!match) fail(400, "La imagen tiene que ser JPG, PNG o WebP");
  const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) fail(400, "La imagen está vacía");
  if (buffer.length > maxBytes) {
    const mb = Math.max(1, Math.round(maxBytes / (1024 * 1024)));
    fail(400, `La imagen supera ${mb} MB`);
  }
  const hex = buffer.subarray(0, 12).toString("hex");
  const jpeg = ext === "jpg" && hex.startsWith("ffd8ff");
  const png = ext === "png" && hex.startsWith("89504e47");
  const webp = ext === "webp" && hex.startsWith("52494646") && buffer.subarray(8, 12).toString() === "WEBP";
  if (!jpeg && !png && !webp) fail(400, "El archivo no es una imagen válida");
  return { ext, buffer };
}

function writeCustomImage(dir, slug, id, dataUrl) {
  const { ext, buffer } = decodeImage(dataUrl);
  const imagesDir = path.join(dir, "images", "destacados", slug);
  fs.mkdirSync(imagesDir, { recursive: true });
  const target = path.join(imagesDir, `${id}.${ext}`);
  if (!inside(dir, target)) fail(400, "Ruta de imagen inválida");
  for (const other of ["jpg", "png", "webp"]) {
    const candidate = path.join(imagesDir, `${id}.${other}`);
    if (candidate !== target && fs.existsSync(candidate)) fs.unlinkSync(candidate);
  }
  fs.writeFileSync(target, buffer);
  const relative = `images/destacados/${slug}/${id}.${ext}`;
  for (const other of ["jpg", "png", "webp"]) {
    if (other !== ext) removePublicImage(`images/destacados/${slug}/${id}.${other}`);
  }
  mirrorToRepo(dir, relative);
  return relative;
}

function writeDestacados(dir, slug, input) {
  if (!Array.isArray(input)) fail(400, "Los destacados tienen que ser una lista");
  const items = [];
  const seen = new Set();
  const kept = new Set();
  for (const value of input) {
    if (items.length >= DESTACADOS_COUNT) break;
    if (value && typeof value === "object" && value.source === "custom") {
      const fields = customFields(value);
      const key = fields.id.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      let image = String(value.image || "");
      if (value.imageDataUrl) image = writeCustomImage(dir, slug, fields.id, value.imageDataUrl);
      if (!isCustomImage(slug, fields.id, image)) fail(400, "La imagen del producto no es válida");
      const file = path.resolve(dir, image);
      if (!inside(dir, file) || !fs.existsSync(file)) fail(400, "Falta la imagen del producto");
      kept.add(image);
      mirrorToRepo(dir, image);
      items.push({ ...fields, image });
      continue;
    }
    const id = destacadoCode(value);
    if (!id) continue;
    const key = id.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(id);
  }
  const folder = path.join(dir, "images", "destacados", slug);
  if (fs.existsSync(folder)) {
    for (const name of fs.readdirSync(folder)) {
      const relative = `images/destacados/${slug}/${name}`;
      const file = path.join(folder, name);
      if (!kept.has(relative) && fs.statSync(file).isFile()) {
        fs.unlinkSync(file);
        removePublicImage(relative);
      }
    }
  }
  return items;
}

function writeImage(dir, slug, dataUrl) {
  const { ext, buffer } = decodeImage(dataUrl);
  const imagesDir = path.join(dir, "images");
  fs.mkdirSync(imagesDir, { recursive: true });
  const target = path.join(imagesDir, `${slug}.${ext}`);
  if (!inside(dir, target)) fail(400, "Ruta de imagen inválida");
  for (const other of ["jpg", "png", "webp"]) {
    const candidate = path.join(imagesDir, `${slug}.${other}`);
    if (candidate !== target && fs.existsSync(candidate)) fs.unlinkSync(candidate);
  }
  fs.writeFileSync(target, buffer);
  const relative = `images/${slug}.${ext}`;
  for (const other of ["jpg", "png", "webp"]) {
    if (other !== ext) removePublicImage(`images/${slug}.${other}`);
  }
  mirrorToRepo(dir, relative);
  return relative;
}

function writeCarouselImage(dir, slug, id, dataUrl) {
  const { ext, buffer } = decodeImage(dataUrl, 2 * 1024 * 1024);
  const imagesDir = path.join(dir, "images", "carousel", slug);
  fs.mkdirSync(imagesDir, { recursive: true });
  const target = path.join(imagesDir, `${id}.${ext}`);
  if (!inside(dir, target)) fail(400, "Ruta de imagen inválida");
  for (const other of ["jpg", "png", "webp"]) {
    const candidate = path.join(imagesDir, `${id}.${other}`);
    if (candidate !== target && fs.existsSync(candidate)) fs.unlinkSync(candidate);
  }
  fs.writeFileSync(target, buffer);
  const relative = `images/carousel/${slug}/${id}.${ext}`;
  for (const other of ["jpg", "png", "webp"]) {
    if (other !== ext) removePublicImage(`images/carousel/${slug}/${id}.${other}`);
  }
  mirrorToRepo(dir, relative);
  return relative;
}

function writeCarousel(dir, slug, input) {
  const normalized = normalizeCarousel(input, slug);
  const kept = new Set();
  const slides = normalized.slides.map((slide) => {
    let image = slide.image;
    if (slide.imageDataUrl) image = writeCarouselImage(dir, slug, slide.id, slide.imageDataUrl);
    if (!isStoredCarouselImage(slug, slide.id, image)) fail(400, "La imagen del carrusel no es válida");
    const file = path.resolve(dir, image);
    if (!inside(dir, file) || !fs.existsSync(file)) fail(400, "Falta una imagen del carrusel");
    kept.add(image);
    mirrorToRepo(dir, image);
    return {
      id: slide.id,
      label: slide.label,
      text: slide.text,
      href: slide.href,
      image,
    };
  });
  const folder = path.join(dir, "images", "carousel", slug);
  if (fs.existsSync(folder)) {
    for (const name of fs.readdirSync(folder)) {
      const relative = `images/carousel/${slug}/${name}`;
      const file = path.join(folder, name);
      if (!kept.has(relative) && fs.statSync(file).isFile()) {
        fs.unlinkSync(file);
        removePublicImage(relative);
      }
    }
    if (!fs.readdirSync(folder).length) fs.rmdirSync(folder);
  }
  return {
    eyebrow: normalized.eyebrow,
    line1: normalized.line1,
    line1Muted: normalized.line1Muted,
    slides,
  };
}

export function saveLanding(slug, heroInput, imageDataUrl, destacadosInput, faqInput, sectionsInput, briefInput, whatsappInput, adsInput, libreInput, carouselInput, clientsInput, cotizarInput, whatsappMessageInput) {
  assertSlug(slug);
  const pack = loadPack();
  const current = landingBySlug(pack, slug);
  if (!current) fail(404, "No existe esa landing");
  const hero = heroInput && typeof heroInput === "object"
    ? {
      ...normalizeHero(heroInput),
      backgroundImage: current.hero.backgroundImage,
    }
    : { ...current.hero };
  if (imageDataUrl) hero.backgroundImage = writeImage(pack.dir, slug, imageDataUrl);
  const whatsapp = whatsappInput !== undefined ? normalizeWhatsapp(whatsappInput) : (current.whatsapp || "");
  const adsConversion = adsInput !== undefined ? normalizeAdsConversion(adsInput) : (current.adsConversion || "");
  const whatsappMessage = whatsappMessageInput !== undefined
    ? normalizeWhatsappMessage(whatsappMessageInput)
    : (current.whatsappMessage || "");
  if (whatsapp) hero.ctaHref = withWhatsappPhone(hero.ctaHref, whatsapp);
  if (whatsappText(hero.ctaHref) !== whatsappMessage) {
    hero.ctaHref = applyWhatsappLink(hero.ctaHref, "", whatsappMessage);
  }
  const next = {
    slug,
    brief: briefInput !== undefined ? normalizeBrief(briefInput) : (current.brief || ""),
    whatsapp,
    whatsappMessage,
    adsConversion,
    hero,
  };
  if (destacadosInput !== undefined) next.destacados = writeDestacados(pack.dir, slug, destacadosInput);
  else if (Array.isArray(current.destacados)) next.destacados = current.destacados;
  if (faqInput !== undefined) next.faq = normalizeFaq(faqInput);
  else if (Array.isArray(current.faq)) next.faq = current.faq;
  next.libre = libreInput !== undefined ? normalizeLibre(libreInput) : normalizeLibre(current.libre);
  next.cotizar = cotizarInput !== undefined ? normalizeCotizar(cotizarInput) : normalizeCotizar(current.cotizar);
  next.carousel = carouselInput !== undefined
    ? writeCarousel(pack.dir, slug, carouselInput)
    : (current.carousel || defaultCarousel());
  if (next.carousel && Array.isArray(next.carousel.slides)) {
    next.carousel = {
      ...next.carousel,
      slides: next.carousel.slides.map((slide) => ({
        ...slide,
        href: whatsappDigits(slide.href)
          ? applyWhatsappLink(slide.href, whatsapp, whatsappMessage)
          : slide.href,
      })),
    };
  }
  if (clientsInput !== undefined) next.clients = writeLandingClients(pack.dir, slug, clientsInput);
  else if (Array.isArray(current.clients)) next.clients = current.clients;
  next.sections = sectionsInput !== undefined
    ? normalizeSections(sectionsInput)
    : current.sections;
  const landings = pack.landings.map((landing) => (
    landing.slug === slug ? next : landing
  ));
  writeLandings(pack.dir, landings);
  return next;
}

export function saveAlta(input) {
  const pack = loadPack();
  const current = pack.site.alta;
  const source = input && typeof input === "object" ? input : {};
  const alta = normalizeAlta({
    brief: Object.prototype.hasOwnProperty.call(source, "brief") ? source.brief : current.brief,
    whatsapp: Object.prototype.hasOwnProperty.call(source, "whatsapp") ? source.whatsapp : current.whatsapp,
    adsConversion: Object.prototype.hasOwnProperty.call(source, "adsConversion") ? source.adsConversion : current.adsConversion,
  });
  const file = path.join(pack.dir, "site.json");
  const raw = readJson(file);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail(500, "El paquete del sitio está mal formado");
  }
  raw.alta = alta;
  fs.writeFileSync(file, JSON.stringify(raw, null, 2) + "\n");
  return alta;
}

function writeClientImage(dir, id, dataUrl, slug = "") {
  const { ext, buffer } = decodeImage(dataUrl, 2 * 1024 * 1024);
  const imagesDir = slug
    ? path.join(dir, "images", "clients", slug)
    : path.join(dir, "images", "clients");
  fs.mkdirSync(imagesDir, { recursive: true });
  const target = path.join(imagesDir, `${id}.${ext}`);
  if (!inside(dir, target)) fail(400, "Ruta de imagen inválida");
  for (const other of ["jpg", "png", "webp"]) {
    const candidate = path.join(imagesDir, `${id}.${other}`);
    if (candidate !== target && fs.existsSync(candidate)) fs.unlinkSync(candidate);
  }
  fs.writeFileSync(target, buffer);
  const relative = slug ? `images/clients/${slug}/${id}.${ext}` : `images/clients/${id}.${ext}`;
  for (const other of ["jpg", "png", "webp"]) {
    if (other !== ext) removePublicImage(slug ? `images/clients/${slug}/${id}.${other}` : `images/clients/${id}.${other}`);
  }
  mirrorToRepo(dir, relative);
  return relative;
}

function writeLandingClients(dir, slug, input) {
  const incoming = normalizeClients(input, slug);
  const kept = new Set();
  const clients = incoming.map((item) => {
    let file = item.file;
    if (item.imageDataUrl) {
      file = writeClientImage(dir, item.id, item.imageDataUrl, slug);
    } else if (isLandingClientFile(slug, item.id, file) || isLegacyClientFile(file)) {
      const target = path.resolve(dir, file);
      if (!inside(dir, target) || !fs.existsSync(target)) fail(400, "Falta la imagen de un icono");
      mirrorToRepo(dir, file);
    } else if (isBuiltinClientFile(file)) {
      builtinClientFile(file);
    } else {
      fail(400, "Falta la imagen de un icono");
    }
    if (isLandingClientFile(slug, item.id, file)) kept.add(path.basename(file));
    return { id: item.id, alt: item.alt, file };
  });
  const folder = path.join(dir, "images", "clients", slug);
  if (fs.existsSync(folder)) {
    for (const name of fs.readdirSync(folder)) {
      const relative = `images/clients/${slug}/${name}`;
      const file = path.join(folder, name);
      if (!kept.has(name) && fs.statSync(file).isFile()) {
        fs.unlinkSync(file);
        removePublicImage(relative);
      }
    }
    if (!fs.readdirSync(folder).length) fs.rmdirSync(folder);
  }
  return clients;
}

function builtinClientFile(file) {
  const root = path.join(studioRoot, "public", "clients");
  const target = path.resolve(root, file);
  if (!inside(root, target) || !fs.existsSync(target)) fail(400, "Falta la imagen de un icono");
  return target;
}

function removeUnusedClientImages(dir, kept) {
  const folder = path.join(dir, "images", "clients");
  if (!fs.existsSync(folder)) return;
  for (const name of fs.readdirSync(folder)) {
    const relative = `images/clients/${name}`;
    if (!isStoredClientFile(relative) || kept.has(relative)) continue;
    const file = path.join(folder, name);
    if (!fs.statSync(file).isFile()) continue;
    fs.unlinkSync(file);
    removePublicImage(relative);
  }
}

export function saveClients(input) {
  const pack = loadPack();
  const incoming = normalizeClients(input);
  const kept = new Set();
  const clients = incoming.map((item) => {
    let file = item.file;
    if (item.imageDataUrl) {
      file = writeClientImage(pack.dir, item.id, item.imageDataUrl);
    } else if (isStoredClientFile(file)) {
      const target = path.resolve(pack.dir, file);
      if (!inside(pack.dir, target) || !fs.existsSync(target)) fail(400, "Falta la imagen de un icono");
      mirrorToRepo(pack.dir, file);
    } else if (isBuiltinClientFile(file)) {
      builtinClientFile(file);
    } else {
      fail(400, "Falta la imagen de un icono");
    }
    if (isStoredClientFile(file)) kept.add(file);
    return { id: item.id, alt: item.alt, file };
  });
  removeUnusedClientImages(pack.dir, kept);
  const rawFile = path.join(pack.dir, "site.json");
  const raw = readJson(rawFile);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail(500, "El paquete del sitio está mal formado");
  }
  raw.clients = clients;
  fs.writeFileSync(rawFile, JSON.stringify(raw, null, 2) + "\n");
  return clients;
}

export function saveFooter(input) {
  const pack = loadPack();
  const footer = normalizeFooter(input);
  const file = path.join(pack.dir, "site.json");
  const raw = readJson(file);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail(500, "El paquete del sitio está mal formado");
  }
  raw.footer = footer;
  fs.writeFileSync(file, JSON.stringify(raw, null, 2) + "\n");
  return footer;
}

const PUBLIC_IMAGE = /^(?:images\/[a-z0-9]+(?:-[a-z0-9]+)*|images\/destacados\/[a-z0-9]+(?:-[a-z0-9]+)*\/c-[a-z0-9]{4,24}|images\/clients\/[a-z0-9][a-z0-9-]{0,40}|images\/clients\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9][a-z0-9-]{0,40}|images\/carousel\/[a-z0-9]+(?:-[a-z0-9]+)*\/s-[a-z0-9]{4,24})\.(jpg|png|webp)$/;

function publicAssetsRoot() {
  return path.resolve(studioRoot, "..", "assets");
}

function publicImageFile(relative) {
  if (!PUBLIC_IMAGE.test(relative)) return "";
  const target = path.resolve(publicAssetsRoot(), relative.slice("images/".length));
  if (!inside(publicAssetsRoot(), target)) return "";
  return target;
}

function mirrorToRepo(dir, relative) {
  const target = publicImageFile(relative);
  const source = path.resolve(dir, relative);
  if (!target || !inside(dir, source) || !fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function removePublicImage(relative) {
  const target = publicImageFile(relative);
  if (target && fs.existsSync(target)) fs.unlinkSync(target);
}

export function mirrorPackImages() {
  const pack = loadPack();
  for (const landing of pack.landings) {
    if (landing.hero.backgroundImage) mirrorToRepo(pack.dir, landing.hero.backgroundImage);
    for (const item of landing.destacados || []) {
      if (item && item.image) mirrorToRepo(pack.dir, item.image);
    }
    for (const slide of (landing.carousel && landing.carousel.slides) || []) {
      if (slide && slide.image) mirrorToRepo(pack.dir, slide.image);
    }
    for (const logo of landing.clients || []) {
      if (logo && isStoredClientFile(logo.file)) mirrorToRepo(pack.dir, logo.file);
    }
  }
  for (const logo of pack.site.clients || []) {
    if (logo && isStoredClientFile(logo.file)) mirrorToRepo(pack.dir, logo.file);
  }
}

export function mediaFile(relative) {
  const pack = loadPack();
  const match = /^(?:images\/([a-z0-9]+(?:-[a-z0-9]+)*)|images\/destacados\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(c-[a-z0-9]{4,24})|images\/clients\/([a-z0-9][a-z0-9-]{0,40})|images\/clients\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9][a-z0-9-]{0,40})|images\/carousel\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(s-[a-z0-9]{4,24}))\.(jpg|png|webp)$/.exec(relative);
  if (!match) fail(404, "No se encontró la imagen");
  const file = path.resolve(pack.dir, relative);
  if (!inside(pack.dir, file) || !fs.existsSync(file)) fail(404, "No se encontró la imagen");
  return file;
}

export function studioPaths() {
  return { studioRoot };
}

export function writePackLandings(landings) {
  const pack = loadPack();
  if (!Array.isArray(landings) || !landings.length) fail(500, "Firestore no devolvió landings");
  const normalized = landings.map(assertLanding);
  writeLandings(pack.dir, normalized);
  return normalized;
}

export function writePackSite(site) {
  const next = assertSite(site);
  const pack = loadPack();
  fs.writeFileSync(path.join(pack.dir, "site.json"), JSON.stringify(next, null, 2) + "\n");
  return next;
}
