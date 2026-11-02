import { fail } from "../shared/content.js";
import { catalogFromArticles } from "../shared/destacados.js";

const ARTICLES_URL = "https://renovaapi-production.up.railway.app/obtenerListadoArticulos";
const OFERTAS_URL = "https://renovaapi-production.up.railway.app/ofertas";
const TIMEOUT_MS = 20000;
const CACHE_MS = 10 * 60_000;

let cache = { at: 0, value: null };

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = 502;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadDestacados({ fresh = false } = {}) {
  if (!fresh && cache.value && Date.now() - cache.at < CACHE_MS) {
    return cache.value;
  }

  try {
    const articles = await fetchJson(ARTICLES_URL);
    if (!Array.isArray(articles)) fail(502, "No se pudieron cargar los artículos");
    let ofertas = null;
    try {
      ofertas = await fetchJson(OFERTAS_URL);
    } catch (error) {
      console.error(error);
    }
    const catalog = catalogFromArticles(articles, ofertas);
    const value = { catalog };
    cache = { at: Date.now(), value };
    return value;
  } catch (error) {
    if (error && error.status) {
      if (error.status === 502) fail(502, "No se pudieron cargar los artículos");
      throw error;
    }
    console.error(error);
    fail(502, "No se pudieron cargar los artículos");
  }
}
