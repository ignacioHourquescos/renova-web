import fs from "node:fs";
import path from "node:path";
import { clientAssetName, isBuiltinClientFile, isStoredClientFile, landingClients, themeCss } from "../shared/content.js";
import { adsSnippet, applyWhatsappLink, consultaClickScript, gaSnippet } from "../shared/tracking.js";
import { loadPack, studioPaths } from "./store.js";

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stampIfWhatsapp(href, phone, message) {
  const value = String(href ?? "");
  if (!value || !/wa\.me|api\.whatsapp\.com|web\.whatsapp\.com/i.test(value)) return value;
  return applyWhatsappLink(value, phone, message);
}

function pageContacts(site, landing) {
  const phone = landing.whatsapp || "";
  const message = landing.whatsappMessage || "";
  if (!phone && !message) return { site, landing };
  const carousel = landing.carousel && Array.isArray(landing.carousel.slides)
    ? {
      ...landing.carousel,
      slides: landing.carousel.slides.map((slide) => ({
        ...slide,
        href: stampIfWhatsapp(slide.href, phone, message),
      })),
    }
    : landing.carousel;
  return {
    site: {
      ...site,
      footer: {
        ...site.footer,
        whatsappHref: applyWhatsappLink(site.footer.whatsappHref, phone, message),
      },
    },
    landing: {
      ...landing,
      carousel,
      hero: {
        ...landing.hero,
        ctaHref: applyWhatsappLink(landing.hero.ctaHref, phone, message),
      },
    },
  };
}

function pageHtml({ site, landing, body }) {
  const heading = landing.hero.heading;
  const title = heading ? `${heading} | ${site.brand}` : site.brand;
  const ads = adsSnippet(landing.adsConversion);
  const clicks = ads ? consultaClickScript() : "";
  return `<!DOCTYPE html>
<html lang="${esc(site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/png" href="../assets/favicon.png">
  <link rel="apple-touch-icon" href="../assets/favicon.png">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(landing.hero.subhead)}">
  <link rel="stylesheet" href="../hero.css">
  <style>:root { ${themeCss(site)} }</style>
  ${gaSnippet()}
  ${ads}
</head>
<body>
${body}
${clicks}
<script src="/views/js/firebase-landings-config.js"></script>
<script src="/views/js/landing-live.js"></script>
</body>
</html>
`;
}

export function faqPageHtml({ site, landing, body }) {
  const heading = landing.hero.heading;
  const title = heading
    ? `Preguntas frecuentes | ${heading} | ${site.brand}`
    : `Preguntas frecuentes | ${site.brand}`;
  return `<!DOCTYPE html>
<html lang="${esc(site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/png" href="../../assets/favicon.png">
  <link rel="apple-touch-icon" href="../../assets/favicon.png">
  <title>${esc(title)}</title>
  <meta name="description" content="Preguntas frecuentes sobre compras mayoristas.">
  <link rel="stylesheet" href="../../hero.css">
  <style>:root { ${themeCss(site)} }</style>
  ${gaSnippet()}
</head>
<body>
${body}
</body>
</html>
`;
}

export function altaPageHtml({ site, body }) {
  const ads = adsSnippet(site.alta && site.alta.adsConversion);
  return `<!DOCTYPE html>
<html lang="${esc(site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/png" href="../assets/favicon.png">
  <link rel="apple-touch-icon" href="../assets/favicon.png">
  <title>${esc(`Alta de cliente | ${site.brand}`)}</title>
  <meta name="description" content="Formulario para darte de alta como cliente mayorista.">
  <link rel="stylesheet" href="../hero.css">
  <style>:root { ${themeCss(site)} }</style>
  ${ads}
  <script src="../views/js/firebase-landings-config.js"></script>
</head>
<body>
${body}
<script src="../views/js/whatsapp-routing.js"></script>
<script src="../views/js/admin-bar.js"></script>
</body>
</html>
`;
}

function copyCarouselImages(pack, landing, tmp) {
  const urls = new Map();
  const slides = landing.carousel && Array.isArray(landing.carousel.slides) ? landing.carousel.slides : [];
  for (const slide of slides) {
    if (!slide || !slide.image) continue;
    const source = path.join(pack.dir, slide.image);
    if (!fs.existsSync(source)) {
      const error = new Error(`Falta una imagen del carrusel de ${landing.slug}`);
      error.status = 400;
      throw error;
    }
    const filename = `${slide.id}${path.extname(slide.image)}`;
    const dir = path.join(tmp, "assets", "carousel", landing.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(source, path.join(dir, filename));
    urls.set(slide.id, `../assets/carousel/${landing.slug}/${filename}`);
  }
  return urls;
}

function copyCustomImages(pack, landing, tmp) {
  const urls = new Map();
  const items = Array.isArray(landing.destacados) ? landing.destacados : [];
  for (const item of items) {
    if (!item || item.source !== "custom" || !item.image) continue;
    const source = path.join(pack.dir, item.image);
    if (!fs.existsSync(source)) {
      const error = new Error(`Falta la imagen de un destacado de ${landing.slug}`);
      error.status = 400;
      throw error;
    }
    const filename = `${item.id}${path.extname(item.image)}`;
    const dir = path.join(tmp, "assets", "destacados", landing.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(source, path.join(dir, filename));
    urls.set(item.id, `../assets/destacados/${landing.slug}/${filename}`);
  }
  return urls;
}

function copyLandingClients(pack, landing, tmp, studioRoot) {
  const logos = landingClients(landing, pack.site);
  if (!logos.length) return;
  const out = path.join(tmp, "assets", "clients", landing.slug);
  fs.mkdirSync(out, { recursive: true });
  for (const logo of logos) {
    const file = String(logo.file || "");
    const source = isStoredClientFile(file)
      ? path.join(pack.dir, file)
      : path.join(studioRoot, "public", "clients", file);
    const known = isStoredClientFile(file) || isBuiltinClientFile(file);
    if (!known || !fs.existsSync(source)) {
      const error = new Error(`Falta el icono ${logo.alt || logo.id}`);
      error.status = 400;
      throw error;
    }
    fs.copyFileSync(source, path.join(out, clientAssetName(logo)));
  }
}

export async function exportSite(renderBody, renderAlta, renderFaq) {
  const pack = loadPack();
  const { studioRoot } = studioPaths();
  const tmp = path.join(studioRoot, "export-tmp");
  const out = path.join(studioRoot, "export");
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(path.join(tmp, "assets"), { recursive: true });
  fs.copyFileSync(
    path.join(studioRoot, "src", "hero.css"),
    path.join(tmp, "hero.css")
  );
  fs.copyFileSync(
    path.join(studioRoot, "public", "qrafip.jpg"),
    path.join(tmp, "assets", "qrafip.jpg")
  );
  fs.copyFileSync(
    path.join(studioRoot, "public", "logo-renova.png"),
    path.join(tmp, "assets", "logo-renova.png")
  );
  fs.copyFileSync(
    path.join(studioRoot, "public", "favicon.png"),
    path.join(tmp, "assets", "favicon.png")
  );
  const brandsDir = path.join(studioRoot, "public", "brands");
  const brandsOut = path.join(tmp, "assets", "brands");
  fs.mkdirSync(brandsOut, { recursive: true });
  for (const name of fs.readdirSync(brandsDir)) {
    if (!/\.(png|jpe?g|webp|avif|svg)$/i.test(name)) continue;
    fs.copyFileSync(path.join(brandsDir, name), path.join(brandsOut, name));
  }

  const pages = [];
  for (const landing of pack.landings) {
    const relativeImage = landing.hero.backgroundImage;
    let imageUrl = "";
    if (relativeImage) {
      const source = path.join(pack.dir, relativeImage);
      if (!fs.existsSync(source)) {
        const error = new Error(`Falta la imagen de ${landing.slug}`);
        error.status = 400;
        throw error;
      }
      const filename = path.basename(relativeImage);
      fs.copyFileSync(source, path.join(tmp, "assets", filename));
      imageUrl = `../assets/${filename}`;
    }
    const customImages = copyCustomImages(pack, landing, tmp);
    const carouselImages = copyCarouselImages(pack, landing, tmp);
    copyLandingClients(pack, landing, tmp, studioRoot);
    const page = pageContacts(pack.site, landing);
    const body = await renderBody(page.site, page.landing, imageUrl, customImages, carouselImages);
    const dir = path.join(tmp, landing.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), pageHtml({
      site: page.site,
      landing: page.landing,
      body,
    }));
    pages.push(`${landing.slug}/index.html`);
    if (renderFaq) {
      const faqDir = path.join(dir, "preguntas");
      fs.mkdirSync(faqDir, { recursive: true });
      fs.writeFileSync(path.join(faqDir, "index.html"), faqPageHtml({
        site: page.site,
        landing: page.landing,
        body: await renderFaq(page.site, page.landing),
      }));
      pages.push(`${landing.slug}/preguntas/index.html`);
    }
  }

  if (renderAlta) {
    const altaDir = path.join(tmp, "alta");
    fs.mkdirSync(altaDir, { recursive: true });
    fs.writeFileSync(path.join(altaDir, "index.html"), altaPageHtml({
      site: pack.site,
      body: await renderAlta(pack.site),
    }));
    pages.push("alta/index.html");
  }

  fs.rmSync(out, { recursive: true, force: true });
  fs.renameSync(tmp, out);
  return { folder: "studio/export", pages };
}
