import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { createLanding, deleteLanding, getSite, saveAlta, saveLandingBrief, saveLandingPatch } from "../api.js";
import { slugFromName } from "../../shared/content.js";
import { formatPhone } from "../../shared/tracking.js";
import { NewLandingModal } from "../components/NewLandingModal.jsx";
import { Spinner } from "../components/Spinner.jsx";

const SMALL_WORDS = new Set(["a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "los", "o", "para", "por", "tu", "u", "y"]);

// Columnas de métricas (Visitas / Click WPP) ocultas por ahora: no se usan en la tabla.
// Poner en `true` para volver a mostrarlas; los datos se siguen cargando y guardando igual.
const SHOW_METRIC_COLUMNS = false;

function landingName(slug) {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14M13 6l6 6-6 6"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7M6.5 7l.8 12.2A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7M10 11v6M14 11v6"
      />
    </svg>
  );
}

function TextCell({ label, value, placeholder, maxLength, onSave, className }) {
  const [text, setText] = useState(value || "");
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    setText(value || "");
  }, [value]);

  async function commit() {
    const next = text.replace(/\s+/g, " ").trim();
    if (next === (value || "")) return;
    setFieldError("");
    try {
      await onSave(next);
    } catch (err) {
      setFieldError(err.message);
    }
  }

  return (
    <label className={className}>
      <span className="sr-only">{label}</span>
      <input
        value={text}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
      />
      {fieldError ? <span className="stats__field-error">{fieldError}</span> : null}
    </label>
  );
}

function PhoneCell({ label, digits, onSave }) {
  const [text, setText] = useState(digits || "");
  const [focused, setFocused] = useState(false);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    setText(digits || "");
    setFieldError("");
  }, [digits]);

  async function commit() {
    const next = text.replace(/\D/g, "");
    setFocused(false);
    if (next === (digits || "")) {
      setText(next);
      setFieldError("");
      return;
    }
    try {
      await onSave(next);
      setFieldError("");
    } catch (err) {
      setFieldError(err.message);
    }
  }

  const shown = focused || fieldError ? text : (text ? formatPhone(text.replace(/\D/g, "")) : "");

  return (
    <label className="stats__field stats__field--phone">
      <span className="sr-only">{label}</span>
      <input
        value={shown}
        inputMode="tel"
        autoComplete="off"
        placeholder="54911…"
        maxLength={24}
        onFocus={() => {
          setFocused(true);
          setText((current) => current.replace(/\D/g, ""));
        }}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
      />
      {fieldError ? <span className="stats__field-error">{fieldError}</span> : null}
    </label>
  );
}

export function LandingList() {
  const { reloadLandings } = useOutletContext();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [landings, setLandings] = useState([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [deleting, setDeleting] = useState("");

  function load() {
    return getSite().then((data) => {
      setSite(data.site);
      setLandings(data.landings);
    });
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  function patchLanding(landing) {
    setLandings((items) => items.map((item) => (
      item.slug === landing.slug ? { ...item, ...landing, visits: item.visits, wppClicks: item.wppClicks } : item
    )));
  }

  async function onDelete(slug) {
    if (confirmSlug !== slug) {
      setConfirmSlug(slug);
      return;
    }
    setDeleting(slug);
    setError("");
    try {
      await deleteLanding(slug);
      setLandings((items) => items.filter((item) => item.slug !== slug));
      setConfirmSlug("");
      reloadLandings();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting("");
    }
  }

  async function onCreate(name) {
    const slug = slugFromName(name);
    if (!slug) {
      throw new Error("El nombre tiene que incluir letras o números");
    }
    const result = await createLanding(slug);
    setCreating(false);
    reloadLandings();
    navigate(`/landings/${result.landing.slug}`);
  }

  const alta = site?.alta;

  return (
    <main className="page page--list">
        <header className="list-head">
          <h1>Páginas</h1>
          <button type="button" className="quiet" onClick={() => setCreating(true)}>
            Agregar
          </button>
        </header>
        {site ? (
          <p className="lede list-lede">
            El WhatsApp y el mensaje que se precarga se definen acá. Ese mensaje queda escrito en todos los links de la landing que abren WhatsApp. En el alta, el mensaje se arma con los datos del formulario.
          </p>
        ) : null}
        {!site && !error ? <p className="lede">Cargando…</p> : null}
        {site ? <div className="stats-wrap">
          <table className="stats">
            <thead>
              <tr>
                <th className="stats__page" scope="col">Página</th>
                <th className="stats__brief-col" scope="col">Descripción</th>
                {SHOW_METRIC_COLUMNS ? <th className="stats__num" scope="col">Visitas</th> : null}
                {SHOW_METRIC_COLUMNS ? <th className="stats__num" scope="col">Click WPP</th> : null}
                <th className="stats__phone" scope="col">WhatsApp</th>
                <th className="stats__message" scope="col" title="Texto que se precarga al abrir WhatsApp desde esta página.">Mensaje</th>
                <th className="stats__action" scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {landings.map((landing) => {
                const name = landingName(landing.slug);
                return (
                  <tr key={landing.slug}>
                    <th scope="row">
                      <Link to={`/landings/${landing.slug}`}>{name}</Link>
                    </th>
                    <td className="stats__brief-col">
                      <TextCell
                        className="stats__brief"
                        label={`Descripción de ${name}`}
                        value={landing.brief || ""}
                        placeholder="Qué es y a quién apunta"
                        maxLength={180}
                        onSave={async (brief) => {
                          const result = await saveLandingBrief(landing.slug, brief);
                          patchLanding(result.landing);
                        }}
                      />
                    </td>
                    {SHOW_METRIC_COLUMNS ? <td className="stats__num">{(landing.visits ?? 0).toLocaleString("es-AR")}</td> : null}
                    {SHOW_METRIC_COLUMNS ? <td className="stats__num">{(landing.wppClicks ?? 0).toLocaleString("es-AR")}</td> : null}
                    <td className="stats__phone">
                      <PhoneCell
                        label={`WhatsApp de ${name}`}
                        digits={landing.whatsapp || ""}
                        onSave={async (whatsapp) => {
                          const result = await saveLandingPatch(landing.slug, { whatsapp });
                          patchLanding(result.landing);
                        }}
                      />
                    </td>
                    <td className="stats__message">
                      <TextCell
                        className="stats__field stats__field--message"
                        label={`Mensaje de WhatsApp de ${name}`}
                        value={landing.whatsappMessage || ""}
                        placeholder="Hola, quiero cotizar…"
                        maxLength={160}
                        onSave={async (whatsappMessage) => {
                          const result = await saveLandingPatch(landing.slug, { whatsappMessage });
                          patchLanding(result.landing);
                        }}
                      />
                    </td>
                    <td className="stats__action">
                      <div className="stats__actions">
                        {confirmSlug === landing.slug ? (
                          <>
                            <button type="button" className="danger" disabled={deleting === landing.slug} onClick={() => onDelete(landing.slug)}>
                              {deleting === landing.slug ? <Spinner /> : null}
                              {deleting === landing.slug ? "Eliminando" : "Confirmar"}
                            </button>
                            <button type="button" className="quiet" disabled={deleting === landing.slug} onClick={() => setConfirmSlug("")}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="stats__icon stats__icon--danger"
                            onClick={() => onDelete(landing.slug)}
                            aria-label={`Eliminar ${name}`}
                            title="Eliminar"
                          >
                            <TrashIcon />
                          </button>
                        )}
                        <a
                          className="stats__icon"
                          href={`/export/${landing.slug}/`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Abrir ${name} en una pestaña nueva`}
                          title="Abrir en una pestaña nueva"
                        >
                          <ArrowIcon />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {alta ? (
                <tr>
                  <th scope="row">
                    <Link to="/alta">Alta</Link>
                  </th>
                  <td className="stats__brief-col">
                    <TextCell
                      className="stats__brief"
                      label="Descripción de Alta"
                      value={alta.brief || ""}
                      placeholder="Qué es y a quién apunta"
                      maxLength={180}
                      onSave={async (brief) => {
                        const result = await saveAlta({ brief });
                        setSite((current) => ({
                          ...current,
                          alta: { ...result.alta, wppClicks: current.alta?.wppClicks ?? 0 },
                        }));
                      }}
                    />
                  </td>
                  {SHOW_METRIC_COLUMNS ? <td className="stats__num">—</td> : null}
                  {SHOW_METRIC_COLUMNS ? <td className="stats__num">{(alta.wppClicks ?? 0).toLocaleString("es-AR")}</td> : null}
                  <td className="stats__phone">
                    <PhoneCell
                      label="WhatsApp de Alta"
                      digits={alta.whatsapp || ""}
                      onSave={async (whatsapp) => {
                        const result = await saveAlta({ whatsapp });
                        setSite((current) => ({
                          ...current,
                          alta: { ...result.alta, wppClicks: current.alta?.wppClicks ?? 0 },
                        }));
                      }}
                    />
                    </td>
                    <td className="stats__message" title="En el alta el mensaje se arma con los datos del formulario.">—</td>
                  <td className="stats__action">
                    <div className="stats__actions">
                      <a
                        className="stats__icon"
                        href="/export/alta/"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Abrir Alta en una pestaña nueva"
                        title="Abrir en una pestaña nueva"
                      >
                        <ArrowIcon />
                      </a>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div> : null}
        <p className={error ? "status status--error" : "status"} role="status">{error}</p>
        {creating ? <NewLandingModal onClose={() => setCreating(false)} onCreate={onCreate} /> : null}
    </main>
  );
}
