import fs from "node:fs";
import path from "node:path";
import { ContentError, clientAssetName, landingClients, sectionOrder, sectionVisible } from "../shared/content.js";
import { resolveDestacados } from "../shared/destacados.js";
import { loadDestacados } from "./destacados.js";
import { exportSite } from "./export.js";
import { publishExport } from "./publish.js";
import { aiStatus, applyProposal, proposeFromTerms, readHistory } from "./keywords.js";
import { deleteLandingDoc, ensureAllLandingStats, pushLandingDoc, pushSiteDoc, readLandingStats, syncFromCloud } from "./firestore.js";
import {
  createLanding,
  deleteLanding,
  loadPack,
  mediaFile,
  mirrorPackImages,
  saveAlta,
  saveClients,
  saveFooter,
  saveLanding,
  studioPaths,
} from "./store.js";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 28 * 1024 * 1024) {
        reject(Object.assign(new Error("El archivo supera el tamaño permitido"), { status: 400 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    const error = new Error("El pedido no es JSON válido");
    error.status = 400;
    throw error;
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function inside(root, file) {
  const relative = path.relative(root, file);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function exportFile(urlPath) {
  const root = path.resolve(studioPaths().studioRoot, "export");
  const relative = decodeURIComponent(urlPath).replace(/^\/export\/?/, "");
  const resolved = path.resolve(root, relative);
  if (!inside(root, resolved)) return null;
  return { root, resolved };
}

function sendExport(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const located = exportFile(url.pathname);
  if (!located || !fs.existsSync(located.root)) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Todavía no hay una exportación. Usá Exportar en el studio.");
    return;
  }

  let target = located.resolved;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    if (!url.pathname.endsWith("/")) {
      res.statusCode = 302;
      res.setHeader("location", `${url.pathname}/${url.search}`);
      res.end();
      return;
    }
    const index = path.join(target, "index.html");
    if (fs.existsSync(index)) {
      target = index;
    } else if (target === located.root) {
      const pages = fs.readdirSync(target, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(target, entry.name, "index.html")))
        .map((entry) => entry.name);
      const links = pages.map((name) => {
        const safe = encodeURIComponent(name);
        return `<li><a href="/export/${safe}/">${safe}</a></li>`;
      }).join("");
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.end(`<!DOCTYPE html><html lang="es"><meta charset="utf-8"><title>Exportación</title><body><h1>HTML exportado</h1><ul>${links}</ul></body></html>`);
      return;
    }
  }

  if (!fs.existsSync(target) || !fs.statSync(target).isFile() || !inside(located.root, target)) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("No se encontró esa página exportada.");
    return;
  }

  res.statusCode = 200;
  res.setHeader("content-type", TYPES[path.extname(target).toLowerCase()] || "application/octet-stream");
  res.setHeader("cache-control", "no-store");
  if ((req.method || "GET") === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(target).pipe(res);
}

async function renderBody(server, site, landing, imageUrl, products, carouselSrc) {
  const React = (await import("react")).default;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const heroMod = await server.ssrLoadModule("/src/components/Hero.jsx");
  const diferencialMod = await server.ssrLoadModule("/src/components/Diferencial.jsx");
  const cotizarMod = await server.ssrLoadModule("/src/components/ComoCotizar.jsx");
  const formularioMod = await server.ssrLoadModule("/src/components/Formulario.jsx");
  const destacadosMod = await server.ssrLoadModule("/src/components/Destacados.jsx");
  const mapMod = await server.ssrLoadModule("/src/components/LocationMap.jsx");
  const faqMod = await server.ssrLoadModule("/src/components/Faq.jsx");
  const libreMod = await server.ssrLoadModule("/src/components/Libre.jsx");
  const carouselMod = await server.ssrLoadModule("/src/components/Carousel.jsx");
  const clientsMod = await server.ssrLoadModule("/src/components/Clients.jsx");
  const marcasMod = await server.ssrLoadModule("/src/components/Marcas.jsx");
  const footerMod = await server.ssrLoadModule("/src/components/Footer.jsx");
  const show = (id) => sectionVisible(landing.sections, id);
  const blocks = {
    hero() {
      return React.createElement(heroMod.Hero, {
        site,
        hero: landing.hero,
        imageUrl,
        logoSrc: "../assets/logo-renova.png",
      });
    },
    marcas() {
      return React.createElement(marcasMod.Marcas, { logoBase: "../assets/brands" });
    },
    diferencial() {
      return React.createElement(diferencialMod.Diferencial, {
        ctaLabel: landing.hero.ctaLabel,
        ctaHref: landing.hero.ctaHref,
      });
    },
    cotizar() {
      return React.createElement(cotizarMod.ComoCotizar, { cotizar: landing.cotizar });
    },
    destacados() {
      return React.createElement(destacadosMod.Destacados, { products });
    },
    carousel() {
      const carousel = landing.carousel || {};
      const slides = (Array.isArray(carousel.slides) ? carousel.slides : []).map((slide) => ({
        ...slide,
        src: carouselSrc && carouselSrc.get(slide.id) ? carouselSrc.get(slide.id) : "",
      }));
      return React.createElement(carouselMod.Carousel, { carousel: { ...carousel, slides } });
    },
    libre() {
      return React.createElement(libreMod.Libre, { libre: landing.libre || {} });
    },
    clients() {
      const logos = landingClients(landing, site).map((logo) => {
        const name = clientAssetName(logo);
        return { id: logo.id, alt: logo.alt, file: name, src: `../assets/clients/${landing.slug}/${name}` };
      });
      return React.createElement(clientsMod.Clients, { logos });
    },
    formulario() {
      return React.createElement(formularioMod.Formulario, { source: landing.slug });
    },
    map() {
      return React.createElement(mapMod.LocationMap, { address: site.footer.address });
    },
    faq() {
      return React.createElement(faqMod.FaqLink);
    },
    footer() {
      return React.createElement(footerMod.Footer, {
        site,
        footer: site.footer,
        qrSrc: "../assets/qrafip.jpg",
      });
    },
  };
  const nodes = [];
  for (const id of sectionOrder(landing.sections)) {
    if (show(id) && blocks[id]) nodes.push(blocks[id]());
  }
  nodes.push(React.createElement(footerMod.WhatsAppFloat, { footer: site.footer }));
  return renderToStaticMarkup(React.createElement(React.Fragment, null, nodes));
}

async function renderFaq(server, landing) {
  const React = (await import("react")).default;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const faqMod = await server.ssrLoadModule("/src/components/Faq.jsx");
  return renderToStaticMarkup(React.createElement(faqMod.FaqPageView, {
    items: landing.faq || [],
    logoSrc: "../../assets/logo-renova.png",
  }));
}

async function renderAlta(server, site) {
  const React = (await import("react")).default;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const altaMod = await server.ssrLoadModule("/src/components/AltaCliente.jsx");
  return renderToStaticMarkup(React.createElement(altaMod.AltaCliente, {
    logoSrc: "../assets/logo-renova.png",
    phone: site.alta ? site.alta.whatsapp : "",
  }));
}

async function handle(server, req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = url.pathname.replace(/\/$/, "") || "/";
  const method = req.method || "GET";

  if ((method === "GET" || method === "HEAD") && (pathname === "/export" || pathname.startsWith("/export/"))) {
    sendExport(req, res);
    return true;
  }

  if (method === "GET" && pathname === "/api/site") {
    await syncFromCloud();
    mirrorPackImages();
    const pack = loadPack();
    const stats = await readLandingStats();
    const landings = pack.landings.map((landing) => ({
      ...landing,
      visits: stats[landing.slug] ? stats[landing.slug].visits : 0,
      wppClicks: stats[landing.slug] ? stats[landing.slug].wppClicks : 0,
    }));
    const site = pack.site.alta
      ? {
        ...pack.site,
        alta: {
          ...pack.site.alta,
          wppClicks: stats.alta ? stats.alta.wppClicks : 0,
        },
      }
      : pack.site;
    send(res, 200, { site, landings });
    return true;
  }

  if (method === "GET" && pathname === "/api/destacados") {
    const { catalog } = await loadDestacados();
    send(res, 200, { catalog });
    return true;
  }

  const media = pathname.match(/^\/api\/media\/(.+)$/);
  if (method === "GET" && media) {
    const file = mediaFile(decodeURIComponent(media[1]));
    res.statusCode = 200;
    res.setHeader("content-type", TYPES[path.extname(file)] || "application/octet-stream");
    res.setHeader("cache-control", "no-store");
    fs.createReadStream(file).pipe(res);
    return true;
  }

  if (method === "POST" && pathname === "/api/landings") {
    const body = await readJson(req);
    const landing = createLanding(String(body.slug ?? "").trim().toLowerCase());
    await pushLandingDoc(landing);
    await ensureAllLandingStats([landing.slug]);
    send(res, 201, { landing });
    return true;
  }

  if (method === "PUT" && pathname === "/api/site/clients") {
    const body = await readJson(req);
    const clients = saveClients(body.clients);
    await pushSiteDoc(loadPack().site);
    send(res, 200, { clients });
    return true;
  }

  if (method === "PUT" && pathname === "/api/site/footer") {
    const body = await readJson(req);
    const footer = saveFooter(body.footer);
    await pushSiteDoc(loadPack().site);
    send(res, 200, { footer });
    return true;
  }

  if (method === "PUT" && pathname === "/api/alta") {
    const body = await readJson(req);
    const alta = saveAlta(body);
    await pushSiteDoc(loadPack().site);
    send(res, 200, { alta });
    return true;
  }

  async function runExport() {
    await syncFromCloud({ force: true });
    const { catalog } = await loadDestacados({ fresh: true });
    return exportSite((site, landing, imageUrl, customImages, carouselImages) => (
      renderBody(
        server,
        site,
        landing,
        imageUrl,
        resolveDestacados(catalog, landing.destacados).map((card) => (
          customImages.has(card.id) ? { ...card, imageUrl: customImages.get(card.id) } : card
        )),
        carouselImages
      )
    ), (site) => renderAlta(server, site), (site, landing) => renderFaq(server, landing));
  }

  if (method === "POST" && pathname === "/api/export") {
    send(res, 200, await runExport());
    return true;
  }

  if (method === "POST" && pathname === "/api/publish") {
    const result = await runExport();
    const published = await publishExport(result.pages || []);
    send(res, 200, published);
    return true;
  }

  const termsRoute = pathname.match(/^\/api\/landings\/([^/]+)\/terms(\/propose|\/apply)?$/);
  if (termsRoute) {
    const slug = decodeURIComponent(termsRoute[1]);
    const action = termsRoute[2] || "";
    if (method === "GET" && !action) {
      send(res, 200, { ai: aiStatus(), history: readHistory(slug) });
      return true;
    }
    if (method === "POST" && action === "/propose") {
      const body = await readJson(req);
      send(res, 200, await proposeFromTerms(slug, body.text));
      return true;
    }
    if (method === "POST" && action === "/apply") {
      const body = await readJson(req);
      const result = applyProposal(slug, body, saveLanding);
      await pushLandingDoc(result.landing);
      send(res, 200, result);
      return true;
    }
  }

  const one = pathname.match(/^\/api\/landings\/([^/]+)$/);
  if (one && method === "PUT") {
    const body = await readJson(req);
    const landing = saveLanding(
      decodeURIComponent(one[1]),
      body.hero,
      body.imageDataUrl || "",
      Object.prototype.hasOwnProperty.call(body, "destacados") ? body.destacados : undefined,
      Object.prototype.hasOwnProperty.call(body, "faq") ? body.faq : undefined,
      Object.prototype.hasOwnProperty.call(body, "sections") ? body.sections : undefined,
      Object.prototype.hasOwnProperty.call(body, "brief") ? body.brief : undefined,
      Object.prototype.hasOwnProperty.call(body, "whatsapp") ? body.whatsapp : undefined,
      Object.prototype.hasOwnProperty.call(body, "adsConversion") ? body.adsConversion : undefined,
      Object.prototype.hasOwnProperty.call(body, "libre") ? body.libre : undefined,
      Object.prototype.hasOwnProperty.call(body, "carousel") ? body.carousel : undefined,
      Object.prototype.hasOwnProperty.call(body, "clients") ? body.clients : undefined,
      Object.prototype.hasOwnProperty.call(body, "cotizar") ? body.cotizar : undefined,
      Object.prototype.hasOwnProperty.call(body, "whatsappMessage") ? body.whatsappMessage : undefined
    );
    await pushLandingDoc(landing);
    send(res, 200, { landing });
    return true;
  }

  if (one && method === "DELETE") {
    const slug = decodeURIComponent(one[1]);
    deleteLanding(slug);
    await deleteLandingDoc(slug);
    send(res, 200, { ok: true });
    return true;
  }

  return false;
}

export function landingStudioPlugin() {
  return {
    name: "landing-studio",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        handle(server, req, res)
          .then((handled) => {
            if (!handled) next();
          })
          .catch((error) => {
            if (res.headersSent) return;
            if (error instanceof ContentError || error.status) {
              send(res, error.status || 400, { error: error.message });
              return;
            }
            console.error(error);
            send(res, 500, { error: "No se pudo completar la acción" });
          });
      });
    },
  };
}
