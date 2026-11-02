import fs from "node:fs";
import path from "node:path";
import { FAQ_COUNT, LIBRE_CARD_COUNT, fail, normalizeFaq, normalizeHero, normalizeLibre, parseCards } from "../shared/content.js";
import { loadPack, studioPaths } from "./store.js";

const MAX_TERMS = 80;
const MAX_INPUT = 600000;

const FACTS = [
  "Renova es una distribuidora mayorista de filtros y lubricantes, con más de 40 años en el mercado.",
  "Vende por mayor, con precio mayorista y stock permanente. No hay monto mínimo obligatorio.",
  "Hace envíos a todo el país por transporte o correo.",
  "Se cotiza por WhatsApp con un listado, códigos, marca, patente o modelo.",
  "Marcas que trabaja: Petronas, Puma Lubricants, Valvoline, Wagner, MANN FILTER, FRAM, TotalEnergies, Castrol, Gulf y Motul.",
  "Local en La Paternal, Ciudad de Buenos Aires, Argentina.",
];

function readEnv() {
  const file = path.join(studioPaths().studioRoot, ".env");
  const values = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match || line.trim().startsWith("#")) continue;
      values[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
  return {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || values.ANTHROPIC_API_KEY || "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || values.OPENAI_API_KEY || "",
    AI_MODEL: process.env.AI_MODEL || values.AI_MODEL || "",
  };
}

export function aiStatus() {
  const env = readEnv();
  if (env.ANTHROPIC_API_KEY) return { configured: true, provider: "anthropic" };
  if (env.OPENAI_API_KEY) return { configured: true, provider: "openai" };
  return { configured: false, provider: "" };
}

function keywordsDir(dir) {
  return path.join(dir, "keywords");
}

function historyFile(dir, slug) {
  return path.join(keywordsDir(dir), `${slug}.json`);
}

export function readHistory(slug) {
  const pack = loadPack();
  const file = historyFile(pack.dir, slug);
  if (!fs.existsSync(file)) return { runs: [] };
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return { runs: Array.isArray(data.runs) ? data.runs : [] };
  } catch {
    return { runs: [] };
  }
}

function writeHistory(slug, history) {
  const pack = loadPack();
  fs.mkdirSync(keywordsDir(pack.dir), { recursive: true });
  fs.writeFileSync(historyFile(pack.dir, slug), JSON.stringify(history, null, 2) + "\n");
}

function parseNumber(value) {
  let text = String(value ?? "").replace(/[^\d.,-]/g, "");
  if (!text || text === "-" || text === "--") return 0;
  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    text = /,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,/g, "");
  } else if (lastDot >= 0 && /\.\d{3}$/.test(text) && text.indexOf(".") === lastDot) {
    text = text.replace(".", "");
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

function splitLine(line, delimiter) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function detectDelimiter(line) {
  const candidates = ["\t", ";", ","];
  let best = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = line.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

const TERM_HEADER = /^(t[eé]rmino de b[uú]squeda|search term|consulta de b[uú]squeda|palabra clave|keyword|t[eé]rmino)$/i;

function findColumn(headers, pattern) {
  return headers.findIndex((header) => pattern.test(header.trim()));
}

export function parseTerms(text) {
  const raw = String(text ?? "").replace(/^\uFEFF/, "");
  if (raw.length > MAX_INPUT) fail(400, "El archivo es demasiado grande");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) fail(400, "No hay términos para analizar");

  let headerIndex = -1;
  let delimiter = ",";
  for (let index = 0; index < Math.min(lines.length, 12); index += 1) {
    const candidate = detectDelimiter(lines[index]);
    const cells = splitLine(lines[index], candidate);
    if (cells.some((cell) => TERM_HEADER.test(cell))) {
      headerIndex = index;
      delimiter = candidate;
      break;
    }
  }

  const byTerm = new Map();
  function add(term, clicks, impressions, conversions) {
    const value = String(term ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!value || value.length > 120 || /[<>]/.test(value)) return;
    if (/^(total|--|—)/.test(value) || /^total:/.test(value)) return;
    const found = byTerm.get(value) || { term: value, clicks: 0, impressions: 0, conversions: 0 };
    found.clicks += clicks;
    found.impressions += impressions;
    found.conversions += conversions;
    byTerm.set(value, found);
  }

  if (headerIndex >= 0) {
    const headers = splitLine(lines[headerIndex], delimiter);
    const termCol = headers.findIndex((cell) => TERM_HEADER.test(cell));
    const clicksCol = findColumn(headers, /^(clics?|clicks?)$/i);
    const imprCol = findColumn(headers, /^(impr\.?|impresiones|impressions)$/i);
    const convCol = findColumn(headers, /^(conversiones|conversions|conv\.?)$/i);
    for (const line of lines.slice(headerIndex + 1)) {
      const cells = splitLine(line, delimiter);
      add(
        cells[termCol],
        clicksCol >= 0 ? parseNumber(cells[clicksCol]) : 0,
        imprCol >= 0 ? parseNumber(cells[imprCol]) : 0,
        convCol >= 0 ? parseNumber(cells[convCol]) : 0
      );
    }
  } else {
    for (const line of lines) add(line.replace(/^[-*\d.\s]+(?=[a-zñáéíóú])/i, ""), 0, 0, 0);
  }

  const terms = [...byTerm.values()].sort((a, b) => (
    b.conversions - a.conversions
    || b.clicks - a.clicks
    || b.impressions - a.impressions
    || a.term.localeCompare(b.term)
  ));
  if (!terms.length) fail(400, "No se encontraron términos de búsqueda en el archivo");
  return terms;
}

function currentContent(landing) {
  return {
    hero: {
      eyebrow: landing.hero.eyebrow || "",
      heading: landing.hero.heading || "",
      subhead: landing.hero.subhead || "",
    },
    libre: {
      heading: landing.libre?.heading || "",
      text: landing.libre?.text || "",
      cards: Array.isArray(landing.libre?.cards) ? landing.libre.cards : [],
    },
    faq: (landing.faq || []).map((item) => ({ question: item.question, answer: item.answer })),
  };
}

function buildPrompt(landing, terms) {
  const system = [
    "Sos redactor de landings de Google Ads para Renova, una distribuidora mayorista argentina de filtros y lubricantes.",
    "Reescribís textos para que coincidan con lo que la gente busca y suban el nivel de calidad del anuncio, con frases naturales de venta.",
    "Escribí en español rioplatense, tuteando con vos. Sin emojis, sin mayúsculas gritonas, sin listas de palabras sueltas.",
    "Reglas:",
    "- Usá solo afirmaciones que figuren en HECHOS o en el contenido actual. No inventes marcas, stock, precios, plazos, certificaciones ni garantías.",
    "- Cada término aparece una o dos veces como máximo, dentro de frases que se lean bien.",
    "- Prioridad: el título del hero lleva el término principal. El subtítulo suma dos o tres variantes. El texto libre y las preguntas frecuentes cubren el resto.",
    "- Las tarjetas (libre.cards) muestran los grupos de productos o servicios que la gente busca. Cada tarjeta lleva como título un término de búsqueda relevante, escrito natural (por ejemplo Aceite 15w40 por tambor) y una o dos frases concretas que lo expliquen. Sin tarjetas que repitan la misma idea y sin palabras sueltas. Las marcas ya tienen su propia sección: no armes tarjetas de marcas.",
    "- Descartá los términos que no tienen relación con lo que vende Renova (por ejemplo una marca que no trabaja, o usuarios que buscan un precio de consumidor final). Listalos en descartados con el motivo.",
    "- Largos: eyebrow hasta 100 caracteres, heading hasta 70, subhead hasta 220, libre.heading hasta 80, libre.text hasta 280 (dos o tres frases cortas, nunca un bloque largo), libre.cards entre 4 y 6 tarjetas con title de hasta 50 caracteres y text de hasta 140, cada pregunta hasta 120, cada respuesta hasta 350.",
    `- Hasta ${FAQ_COUNT} preguntas frecuentes en total. Mantené las que siguen siendo útiles y reescribí o sumá las necesarias. Las respuestas son verdaderas según HECHOS.`,
    "- Devolvé únicamente JSON válido con esta forma exacta, sin texto fuera del JSON:",
    '{"hero":{"eyebrow":"","heading":"","subhead":""},"libre":{"heading":"","text":"","cards":[{"title":"","text":""}]},"faq":[{"question":"","answer":""}],"descartados":[{"term":"","motivo":""}],"notas":""}',
  ].join("\n");

  const user = [
    "HECHOS:",
    ...FACTS.map((fact) => `- ${fact}`),
    "",
    `LANDING: ${landing.slug}${landing.brief ? ` (${landing.brief})` : ""}`,
    "",
    "CONTENIDO ACTUAL:",
    JSON.stringify(currentContent(landing), null, 2),
    "",
    "TÉRMINOS DE BÚSQUEDA (ordenados por conversiones, clics e impresiones):",
    ...terms.map((item) => `- ${item.term} | clics ${item.clicks} | impresiones ${item.impressions} | conversiones ${item.conversions}`),
  ].join("\n");

  return { system, user };
}

async function askAi(system, user) {
  const env = readEnv();
  const signal = AbortSignal.timeout(120000);
  if (env.ANTHROPIC_API_KEY) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.AI_MODEL || "claude-sonnet-4-5",
        max_tokens: 4000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) fail(502, data?.error?.message || "La IA no respondió");
    return (data.content || []).map((part) => part.text || "").join("");
  }
  if (env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL || "gpt-4.1",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) fail(502, data?.error?.message || "La IA no respondió");
    return data.choices?.[0]?.message?.content || "";
  }
  return fail(400, "Falta la clave de la IA. Cargala en studio/.env y volvé a intentar");
}

function parseJsonReply(text) {
  const body = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) fail(502, "La IA devolvió una respuesta que no se puede leer");
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return fail(502, "La IA devolvió una respuesta que no se puede leer");
  }
}

function safe(text, max) {
  const value = String(text ?? "").replace(/[<>]/g, "").replace(/[ \t]+/g, " ").trim();
  return value.length > max ? value.slice(0, max).trim() : value;
}

function sanitizeProposal(reply, landing) {
  const now = currentContent(landing);
  const proposal = {};

  if (reply.hero && typeof reply.hero === "object") {
    const hero = {
      eyebrow: safe(reply.hero.eyebrow, 140),
      heading: safe(reply.hero.heading, 180),
      subhead: safe(reply.hero.subhead, 500),
    };
    if (hero.heading) {
      try {
        normalizeHero({ ...landing.hero, ...hero });
        proposal.hero = hero;
      } catch {
        /* se descarta */
      }
    }
  }

  if (reply.libre && typeof reply.libre === "object") {
    const libre = {
      heading: safe(reply.libre.heading, 180),
      text: safe(reply.libre.text, 4000),
      cards: parseCards(Array.isArray(reply.libre.cards) ? reply.libre.cards : [])
        .filter((card) => card.title)
        .map((card) => ({ title: safe(card.title, 60), text: safe(card.text, 200) }))
        .slice(0, LIBRE_CARD_COUNT),
    };
    if (libre.heading || libre.text || libre.cards.length) {
      try {
        proposal.libre = normalizeLibre(libre);
      } catch {
        /* se descarta */
      }
    }
  }

  if (Array.isArray(reply.faq) && reply.faq.length) {
    const items = reply.faq
      .map((item) => ({ question: safe(item?.question, 220), answer: safe(item?.answer, 1200) }))
      .filter((item) => item.question && item.answer)
      .slice(0, FAQ_COUNT);
    if (items.length) {
      try {
        proposal.faq = normalizeFaq(items);
      } catch {
        /* se descarta */
      }
    }
  }

  const descartados = (Array.isArray(reply.descartados) ? reply.descartados : [])
    .map((item) => ({ term: safe(item?.term, 120), motivo: safe(item?.motivo, 200) }))
    .filter((item) => item.term)
    .slice(0, 80);

  return {
    current: now,
    proposal,
    discarded: descartados,
    notes: safe(reply.notas, 600),
  };
}

export async function proposeFromTerms(slug, text) {
  const pack = loadPack();
  const landing = pack.landings.find((item) => item.slug === slug);
  if (!landing) fail(404, "No existe esa landing");
  const terms = parseTerms(text).slice(0, MAX_TERMS);
  const { system, user } = buildPrompt(landing, terms);
  const reply = parseJsonReply(await askAi(system, user));
  return { terms, ...sanitizeProposal(reply, landing) };
}

export function applyProposal(slug, input, saveLanding) {
  const pack = loadPack();
  const landing = pack.landings.find((item) => item.slug === slug);
  if (!landing) fail(404, "No existe esa landing");
  const fields = input && typeof input.fields === "object" && input.fields ? input.fields : {};
  const applied = [];

  let hero;
  if (fields.hero && typeof fields.hero === "object") {
    hero = normalizeHero({
      ...landing.hero,
      eyebrow: fields.hero.eyebrow,
      heading: fields.hero.heading,
      subhead: fields.hero.subhead,
    });
    applied.push("hero");
  }
  let libre;
  if (fields.libre && typeof fields.libre === "object") {
    libre = normalizeLibre(fields.libre);
    applied.push("libre");
  }
  let faq;
  if (Array.isArray(fields.faq)) {
    faq = normalizeFaq(fields.faq);
    applied.push("faq");
  }
  if (!applied.length) fail(400, "No elegiste ningún cambio");

  const saved = saveLanding(slug, hero, "", undefined, faq, undefined, undefined, undefined, undefined, libre);

  const terms = (Array.isArray(input.terms) ? input.terms : [])
    .slice(0, MAX_TERMS)
    .map((item) => ({
      term: safe(item?.term, 120),
      clicks: Number(item?.clicks) || 0,
      impressions: Number(item?.impressions) || 0,
      conversions: Number(item?.conversions) || 0,
    }))
    .filter((item) => item.term);
  const history = readHistory(slug);
  history.runs.push({ at: new Date().toISOString(), applied, terms });
  writeHistory(slug, { runs: history.runs.slice(-30) });
  return { landing: saved, applied };
}
