import { ALTA_CONVERSION, DEFAULT_WHATSAPP, adsConversionOrNull } from "./tracking.js";

export class ContentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function fail(status, message) {
  throw new ContentError(message, status);
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertSlug(slug) {
  if (!SLUG.test(slug)) {
    fail(400, "La ruta solo puede tener minúsculas, números y guiones");
  }
}

export function slugFromName(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isSafeHref(value) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (/^#[A-Za-z0-9_-]+$/.test(value)) return true;
  return /^(https?:|mailto:|tel:)/i.test(value);
}

function clean(value, max, label) {
  const text = String(value ?? "").trim();
  if (text.length > max) fail(400, `El ${label} es demasiado largo`);
  return text;
}

export function normalizeBrief(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length > 180) fail(400, "La descripción es demasiado larga");
  return text;
}

export function normalizeWhatsapp(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length < 8 || digits.length > 15) {
    fail(400, "El WhatsApp tiene que tener entre 8 y 15 dígitos");
  }
  return digits;
}

export function normalizeAdsConversion(value) {
  const parsed = adsConversionOrNull(value);
  if (parsed === null) {
    fail(400, "La conversión tiene que ser el código de Google Ads, por ejemplo AW-963730457/etiqueta");
  }
  return parsed;
}

export function defaultAlta() {
  return {
    brief: "Formulario de alta de cliente mayorista.",
    whatsapp: DEFAULT_WHATSAPP,
    adsConversion: ALTA_CONVERSION,
  };
}

export function normalizeAlta(input) {
  const source = input && typeof input === "object" ? input : {};
  const has = (key) => Object.prototype.hasOwnProperty.call(source, key);
  return {
    brief: has("brief") ? normalizeBrief(source.brief) : defaultAlta().brief,
    whatsapp: has("whatsapp") ? normalizeWhatsapp(source.whatsapp) : defaultAlta().whatsapp,
    adsConversion: has("adsConversion") ? normalizeAdsConversion(source.adsConversion) : defaultAlta().adsConversion,
  };
}

export function normalizeHero(input) {
  const source = input && typeof input === "object" ? input : {};
  const hero = {
    eyebrow: clean(source.eyebrow, 140, "antetítulo"),
    heading: clean(source.heading, 180, "título"),
    subhead: clean(source.subhead, 500, "bajada"),
    ctaLabel: clean(source.ctaLabel, 80, "texto del botón"),
    ctaHref: clean(source.ctaHref, 500, "link"),
  };
  if (!isSafeHref(hero.ctaHref)) {
    fail(400, "El link tiene que empezar con http, https, mailto, tel, / o #");
  }
  return hero;
}

export function defaultFooter() {
  return {
    legalName: "Renova (Grosso Fiore)",
    taxId: "20-93461300-8",
    address: "Dr. Adolfo Dickman 984, La Paternal, CABA, Argentina",
    privacyLabel: "Aviso de privacidad",
    privacyHref: "#privacidad",
    privacyText: "Responsable del tratamiento de tus datos: Renova (Grosso Fiore), CUIT 20-93461300-8, con domicilio en Dr. Adolfo Dickman 984, La Paternal, Ciudad Autónoma de Buenos Aires. Finalidad: usar los datos que nos enviás exclusivamente para contactarte y enviarte la cotización mayorista solicitada. Tus datos no se ceden ni comparten con terceros. Podés ejercer tus derechos de acceso, rectificación y supresión escribiendo a renovafiltros@gmail.com, conforme la Ley 25.326 de Protección de Datos Personales.",
    copyright: "© 2026 Renova. Todos los derechos reservados.",
    whatsappHref: "https://wa.me/5491140565047?text=Hola%2C%20quiero%20una%20cotizaci%C3%B3n%20mayorista.",
  };
}

export function normalizeFooter(input) {
  const source = input && typeof input === "object" ? input : {};
  const footer = {
    legalName: clean(source.legalName, 80, "nombre legal"),
    taxId: clean(source.taxId, 40, "CUIT"),
    address: clean(source.address, 180, "domicilio"),
    privacyLabel: clean(source.privacyLabel, 80, "texto del aviso"),
    privacyHref: clean(source.privacyHref, 500, "link del aviso"),
    privacyText: clean(source.privacyText, 1500, "aviso de privacidad"),
    copyright: clean(source.copyright, 160, "copyright"),
    whatsappHref: clean(source.whatsappHref || source.ctaHref, 500, "link de WhatsApp"),
  };
  for (const [value, label] of [
    [footer.whatsappHref, "WhatsApp"],
    [footer.privacyHref, "aviso de privacidad"],
  ]) {
    if (!isSafeHref(value)) {
      fail(400, `El link del ${label} tiene que empezar con http, https, mailto, tel, / o #`);
    }
  }
  return footer;
}

export const SECTION_IDS = [
  "hero",
  "marcas",
  "diferencial",
  "cotizar",
  "destacados",
  "carousel",
  "libre",
  "clients",
  "formulario",
  "map",
  "faq",
  "buscabas",
  "footer",
];

export function sectionOrder(input) {
  const list = Array.isArray(input)
    ? input
    : (input && typeof input === "object" && Array.isArray(input.order) ? input.order : []);
  const seen = new Set();
  const order = [];
  for (const id of list) {
    if (SECTION_IDS.includes(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  for (const id of SECTION_IDS) {
    if (seen.has(id)) continue;
    const canonical = SECTION_IDS.indexOf(id);
    let insertAt = order.length;
    for (let index = 0; index < order.length; index += 1) {
      if (SECTION_IDS.indexOf(order[index]) > canonical) {
        insertAt = index;
        break;
      }
    }
    order.splice(insertAt, 0, id);
    seen.add(id);
  }
  return order;
}

export function normalizeSections(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const sections = { order: sectionOrder(source) };
  for (const id of SECTION_IDS) {
    sections[id] = source[id] !== false;
  }
  return sections;
}

export function moveSection(sections, id, delta) {
  const current = normalizeSections(sections);
  const index = current.order.indexOf(id);
  const target = index + Number(delta);
  if (index < 0 || target < 0 || target >= current.order.length) return current;
  const order = current.order.slice();
  const [item] = order.splice(index, 1);
  order.splice(target, 0, item);
  return { ...current, order };
}

export function sectionVisible(sections, id) {
  return !sections || sections[id] !== false;
}

export const CLIENT_COUNT = 16;

const CLIENT_ID = /^[a-z0-9][a-z0-9-]{0,40}$/;
const BUILTIN_CLIENT_FILE = /^[a-z0-9][a-z0-9_-]*\.(png|jpe?g|webp)$/;
const LEGACY_CLIENT_FILE = /^images\/clients\/([a-z0-9][a-z0-9-]{0,40})\.(jpg|png|webp)$/;
const LANDING_CLIENT_FILE = /^images\/clients\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9][a-z0-9-]{0,40})\.(jpg|png|webp)$/;

const DEFAULT_CLIENTS = [
  { id: "axion", alt: "Axion energy", file: "axion.png" },
  { id: "gobierno", alt: "Gobierno de la Ciudad", file: "gobierno.png" },
  { id: "hertz", alt: "Hertz", file: "hertz.png" },
  { id: "petronor", alt: "Petronor", file: "images.png" },
  { id: "kavak", alt: "Kavak", file: "kavak.png" },
  { id: "roggio", alt: "Roggio", file: "roggio_bn.png" },
  { id: "subte", alt: "Subte", file: "subte.png" },
];

export function defaultClients() {
  return DEFAULT_CLIENTS.map((logo) => ({ ...logo }));
}

export function isBuiltinClientFile(file) {
  return BUILTIN_CLIENT_FILE.test(String(file || ""));
}

export function isLegacyClientFile(file) {
  return LEGACY_CLIENT_FILE.test(String(file || ""));
}

export function isLandingClientFile(slug, id, file) {
  const match = LANDING_CLIENT_FILE.exec(String(file || ""));
  return Boolean(match && match[1] === slug && match[2] === id);
}

export function isStoredClientFile(file) {
  return isLegacyClientFile(file) || LANDING_CLIENT_FILE.test(String(file || ""));
}

export function clientAssetName(logo) {
  const match = /\.(png|jpe?g|webp)$/i.exec(String(logo?.file || ""));
  const ext = match ? match[0].toLowerCase().replace(/jpeg$/, "jpg") : ".png";
  return `${logo.id}${ext}`;
}

export function siteClients(site) {
  const clients = site && site.clients;
  return Array.isArray(clients) ? clients.map((logo) => ({ ...logo })) : defaultClients();
}

export function landingClients(landing, site) {
  if (landing && Array.isArray(landing.clients)) {
    return landing.clients.map((logo) => ({ ...logo }));
  }
  return siteClients(site);
}

function cleanClientAlt(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length > 80) fail(400, "El nombre del icono es demasiado largo");
  return text;
}

export function normalizeClients(input, slug) {
  if (!Array.isArray(input)) fail(400, "Los iconos de clientes tienen que ser una lista");
  if (input.length > CLIENT_COUNT) fail(400, `Podés cargar hasta ${CLIENT_COUNT} iconos`);
  const seen = new Set();
  return input.map((item) => {
    const source = item && typeof item === "object" ? item : {};
    const id = String(source.id ?? "").trim();
    if (!CLIENT_ID.test(id)) fail(400, "Hay un icono de cliente inválido");
    if (seen.has(id)) fail(400, "Hay iconos de clientes repetidos");
    seen.add(id);
    const alt = cleanClientAlt(source.alt);
    const file = String(source.file ?? "").trim();
    const imageDataUrl = String(source.imageDataUrl ?? "");
    const legacy = LEGACY_CLIENT_FILE.exec(file);
    if (file && !isBuiltinClientFile(file) && !isStoredClientFile(file)) {
      fail(400, "La imagen del icono no es válida");
    }
    if (legacy && legacy[1] !== id) fail(400, "La imagen del icono no es válida");
    if (LANDING_CLIENT_FILE.test(file) && !isLandingClientFile(slug, id, file)) {
      fail(400, "La imagen del icono no es válida");
    }
    if (!file && !imageDataUrl) fail(400, "Falta la imagen de un icono");
    const next = { id, alt, file };
    if (imageDataUrl) next.imageDataUrl = imageDataUrl;
    return next;
  });
}

export const FAQ_COUNT = 12;

export function defaultFaq() {
  return [
    {
      question: "¿Hacen envíos a todo el país?",
      answer: "Sí, realizamos envíos a todo el país mediante transporte o correo.",
    },
    {
      question: "¿Qué productos puedo comprar?",
      answer: "Filtros, lubricantes y productos de mantenimiento. Vendemos por mayor.",
    },
    {
      question: "¿Puedo cotizar con un código o una marca?",
      answer: "Sí, pasanos el código, la marca o una referencia del producto y lo buscamos.",
    },
    {
      question: "¿Pueden conseguir productos que no tienen publicados?",
      answer: "Sí, buscamos alternativas y equivalencias según lo que necesites.",
    },
    {
      question: "¿Tienen stock para pedidos grandes?",
      answer: "Sí, contamos con stock y podemos preparar pedidos según tu volumen de compra.",
    },
    {
      question: "¿Puedo incluir varios productos en un mismo pedido?",
      answer: "Sí, enviános tu listado completo y cotizamos todo junto.",
    },
    {
      question: "¿Hay un monto mínimo de compra?",
      answer: "No hay un monto mínimo obligatorio. Cotizamos según lo que necesites.",
    },
    {
      question: "¿Cómo calculo el costo de envío?",
      answer: "Lo coordinamos según el destino, el volumen y el transporte elegido.",
    },
    {
      question: "¿Puedo comprar sin ir hasta el local?",
      answer: "Sí, podés hacer todo el pedido de forma remota y coordinamos el envío.",
    },
    {
      question: "¿Cómo solicito una cotización?",
      answer: "Enviános tu listado, códigos o consulta y te preparamos una cotización.",
    },
  ];
}

export function normalizeFaq(input) {
  if (!Array.isArray(input)) fail(400, "Las preguntas frecuentes tienen que ser una lista");
  if (input.length > FAQ_COUNT) {
    fail(400, `Podés cargar hasta ${FAQ_COUNT} preguntas`);
  }
  return input.map((item) => {
    const source = item && typeof item === "object" ? item : {};
    return {
      question: clean(source.question, 220, "pregunta"),
      answer: clean(source.answer, 1200, "respuesta"),
    };
  });
}

export function defaultCotizar() {
  return {
    heading: "Cómo cotizar",
    lead: "En tres pasos, por WhatsApp. No hace falta un listado perfecto.",
    steps: [
      {
        title: "Mandás marca, código o patente",
        text: "Si no tenés el código, con la patente o el modelo alcanza.",
      },
      {
        title: "Te respondemos la cotización por WhatsApp",
        text: "Te pasamos el precio mayorista por el mismo chat.",
      },
      {
        title: "Coordinamos la entrega",
        text: "A tu depósito, taller o campo.",
      },
    ],
  };
}

export function normalizeCotizar(input) {
  const fallback = defaultCotizar();
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const stepsIn = Array.isArray(source.steps) ? source.steps : [];
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  return {
    heading: has(source, "heading") ? clean(source.heading, 80, "título de cómo cotizar") : fallback.heading,
    lead: has(source, "lead") ? clean(source.lead, 240, "bajada de cómo cotizar") : fallback.lead,
    steps: fallback.steps.map((step, index) => {
      const item = stepsIn[index] && typeof stepsIn[index] === "object" ? stepsIn[index] : {};
      return {
        title: has(item, "title") ? clean(item.title, 120, "título del paso") : step.title,
        text: has(item, "text") ? clean(item.text, 280, "texto del paso") : step.text,
      };
    }),
  };
}

export function defaultLibre() {
  return {
    heading: "",
    text: "",
  };
}

export function normalizeLibre(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return {
    heading: clean(source.heading, 180, "título del espacio libre"),
    text: clean(source.text, 4000, "texto del espacio libre"),
  };
}

export const CAROUSEL_COUNT = 8;

const SLIDE_ID = /^s-[a-z0-9]{4,24}$/;
const STORED_SLIDE = /^images\/carousel\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(s-[a-z0-9]{4,24})\.(jpg|png|webp)$/;

export function isStoredCarouselImage(slug, id, file) {
  const match = STORED_SLIDE.exec(String(file || ""));
  return Boolean(match && match[1] === slug && match[2] === id);
}

export function defaultCarousel() {
  return {
    eyebrow: "",
    line1: "",
    line1Muted: "",
    slides: [],
  };
}

export function normalizeCarousel(input, slug) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const slidesIn = Array.isArray(source.slides) ? source.slides : [];
  if (slidesIn.length > CAROUSEL_COUNT) {
    fail(400, `Podés cargar hasta ${CAROUSEL_COUNT} imágenes en el carrusel`);
  }
  const seen = new Set();
  const slides = slidesIn.map((item) => {
    const slide = item && typeof item === "object" ? item : {};
    const id = String(slide.id ?? "").trim();
    if (!SLIDE_ID.test(id)) fail(400, "Hay una imagen del carrusel inválida");
    if (seen.has(id)) fail(400, "Hay imágenes del carrusel repetidas");
    seen.add(id);
    const image = String(slide.image ?? "").trim();
    const imageDataUrl = String(slide.imageDataUrl ?? "");
    if (image && !isStoredCarouselImage(slug, id, image)) {
      fail(400, "La imagen del carrusel no es válida");
    }
    if (!image && !imageDataUrl) fail(400, "Falta una imagen del carrusel");
    const href = clean(slide.href, 500, "link de la imagen");
    if (!isSafeHref(href)) {
      fail(400, "El link de la imagen tiene que empezar con http, https, mailto, tel, / o #");
    }
    const next = {
      id,
      label: clean(slide.label, 48, "nombre de la imagen"),
      text: clean(slide.text, 280, "texto de la imagen"),
      href,
      image,
    };
    if (imageDataUrl) next.imageDataUrl = imageDataUrl;
    return next;
  });
  return {
    eyebrow: clean(source.eyebrow, 40, "etiqueta del carrusel"),
    line1: clean(source.line1, 48, "título del carrusel"),
    line1Muted: clean(source.line1Muted, 80, "subtítulo del carrusel"),
    slides,
  };
}

export function emptyHero() {
  return {
    backgroundImage: "",
    eyebrow: "",
    heading: "Título de la landing",
    subhead: "",
    ctaLabel: "Quiero que me contacten",
    ctaHref: "",
  };
}

const HEX_OR_RGB = /^(?:#[0-9a-f]{3}|#[0-9a-f]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\))$/i;
const FONT = /^[a-zA-Z0-9 ,."'-]+$/;

function assertColor(value, label) {
  if (typeof value !== "string" || !HEX_OR_RGB.test(value)) {
    fail(500, `Color inválido en el paquete del sitio: ${label}`);
  }
}

export function assertSite(site) {
  if (!site || typeof site !== "object") fail(500, "El paquete del sitio está mal formado");
  const brand = String(site.brand ?? "").trim();
  if (!brand || brand.length > 40 || /[<>]/.test(brand)) {
    fail(500, "La marca del sitio es inválida");
  }
  const lang = site.lang || "es";
  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(lang)) fail(500, "El idioma del sitio es inválido");
  const colors = site.colors || {};
  for (const key of ["page", "text", "muted", "accent", "accentDark", "accentText", "overlay"]) {
    assertColor(colors[key], key);
  }
  const fonts = site.fonts || {};
  for (const key of ["heading", "body"]) {
    if (typeof fonts[key] !== "string" || !FONT.test(fonts[key])) {
      fail(500, `Tipografía inválida en el paquete del sitio: ${key}`);
    }
  }
  const footerSource = site.footer && typeof site.footer === "object" ? site.footer : defaultFooter();
  const result = {
    brand,
    lang,
    colors: {
      page: colors.page,
      text: colors.text,
      muted: colors.muted,
      accent: colors.accent,
      accentDark: colors.accentDark,
      accentText: colors.accentText,
      overlay: colors.overlay,
    },
    fonts: {
      heading: fonts.heading,
      body: fonts.body,
    },
    footer: normalizeFooter(footerSource),
    alta: normalizeAlta(site.alta),
  };
  if (Object.prototype.hasOwnProperty.call(site, "clients")) {
    result.clients = normalizeClients(site.clients).map((logo) => {
      if (!logo.file || logo.imageDataUrl) fail(500, "Los iconos de clientes están mal guardados");
      return { id: logo.id, alt: logo.alt, file: logo.file };
    });
  }
  return result;
}

export function themeVars(site) {
  return {
    "--color-page": site.colors.page,
    "--color-text": site.colors.text,
    "--color-muted": site.colors.muted,
    "--color-accent": site.colors.accent,
    "--color-accent-dark": site.colors.accentDark,
    "--color-accent-text": site.colors.accentText,
    "--color-overlay": site.colors.overlay,
    "--font-heading": site.fonts.heading,
    "--font-body": site.fonts.body,
  };
}

export function themeCss(site) {
  return Object.entries(themeVars(site))
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}
