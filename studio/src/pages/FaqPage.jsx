import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FAQ_COUNT } from "../../shared/content.js";
import { getSite, saveLanding } from "../api.js";
import { FaqPageView } from "../components/Faq.jsx";
import { DevicePreview } from "../components/DevicePreview.jsx";
import { Spinner } from "../components/Spinner.jsx";

const SAVE_DELAY = 600;

function faqFields(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    question: item?.question ?? "",
    answer: item?.answer ?? "",
  }));
}

function faqKey(items) {
  return JSON.stringify(faqFields(items));
}

function faqJson(items) {
  return JSON.stringify(faqFields(items), null, 2);
}

let faqUid = 1;

function tagFaq(items) {
  return faqFields(items).map((item) => {
    faqUid += 1;
    return { _id: faqUid, ...item };
  });
}

function parseFaqJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "El JSON no es válido" };
  }
  if (!Array.isArray(parsed)) return { error: "Tiene que ser una lista de preguntas" };
  if (parsed.length > FAQ_COUNT) return { error: `Podés cargar hasta ${FAQ_COUNT} preguntas` };
  const items = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { error: "Cada ítem tiene que tener question y answer" };
    }
    const question = String(item.question ?? "");
    const answer = String(item.answer ?? "");
    if (question.length > 220) return { error: "Hay una pregunta demasiado larga" };
    if (answer.length > 1200) return { error: "Hay una respuesta demasiado larga" };
    items.push({ question, answer });
  }
  return { items };
}

function FaqJsonEditor({ items, onChange }) {
  const serialized = faqJson(items);
  const [text, setText] = useState(serialized);
  const [jsonError, setJsonError] = useState("");
  const textRef = useRef(serialized);
  textRef.current = text;

  useEffect(() => {
    const parsed = parseFaqJson(textRef.current);
    if (!parsed.error && faqJson(parsed.items) === serialized) return;
    setJsonError("");
    setText(serialized);
  }, [serialized]);

  function onInput(event) {
    const next = event.target.value;
    setText(next);
    const parsed = parseFaqJson(next);
    if (parsed.error) {
      setJsonError(parsed.error);
      return;
    }
    setJsonError("");
    if (faqKey(parsed.items) === faqKey(items)) return;
    onChange(tagFaq(parsed.items));
  }

  return (
    <label className="faq-json">
      <span>Preguntas</span>
      <textarea
        value={text}
        onChange={onInput}
        spellCheck={false}
        aria-invalid={jsonError ? true : undefined}
      />
      {jsonError ? <p className="status status--error">{jsonError}</p> : null}
    </label>
  );
}

export function FaqPage() {
  const { slug } = useParams();
  const [site, setSite] = useState(null);
  const [items, setItems] = useState([]);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [viewport, setViewport] = useState("desktop");
  const itemsRef = useRef([]);
  const savedKeyRef = useRef(faqKey([]));
  const readyRef = useRef(false);
  const aliveRef = useRef(true);
  const timerRef = useRef(0);
  const slugRef = useRef(slug);
  slugRef.current = slug;

  useEffect(() => {
    let active = true;
    readyRef.current = false;
    setMissing(false);
    setError("");
    setSaveState("idle");
    getSite()
      .then((data) => {
        if (!active) return;
        const landing = data.landings.find((item) => item.slug === slug);
        if (!landing) {
          setMissing(true);
          setSite(null);
          return;
        }
        const tagged = tagFaq(landing.faq);
        itemsRef.current = tagged;
        savedKeyRef.current = faqKey(tagged);
        setItems(tagged);
        setSite(data.site);
        readyRef.current = true;
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      window.clearTimeout(timerRef.current);
      const snapshot = faqFields(itemsRef.current);
      if (!readyRef.current || faqKey(snapshot) === savedKeyRef.current) return;
      saveLanding(slugRef.current, null, "", { faq: snapshot, keepalive: true }).catch(() => {});
    };
  }, [slug]);

  function commit(next) {
    if (!readyRef.current) return;
    itemsRef.current = next;
    setItems(next);
    setError("");
    window.clearTimeout(timerRef.current);
    const slugAtEdit = slugRef.current;
    timerRef.current = window.setTimeout(() => {
      persist(slugAtEdit).catch((err) => {
        if (!aliveRef.current) return;
        setSaveState("error");
        setError(err.message);
      });
    }, SAVE_DELAY);
  }

  async function persist(slugAtEdit) {
    const snapshot = itemsRef.current;
    const key = faqKey(snapshot);
    if (key === savedKeyRef.current) return;
    if (aliveRef.current) {
      setSaveState("saving");
      setError("");
    }
    const result = await saveLanding(slugAtEdit, null, "", { faq: faqFields(snapshot) });
    if (slugRef.current !== slugAtEdit) return;
    const returned = faqFields(result.landing.faq);
    if (faqKey(itemsRef.current) !== key) {
      savedKeyRef.current = faqKey(returned) === key ? key : savedKeyRef.current;
      if (faqKey(itemsRef.current) !== savedKeyRef.current) {
        await persist(slugAtEdit);
      }
      return;
    }
    if (faqKey(returned) !== key) {
      const tagged = tagFaq(returned);
      itemsRef.current = tagged;
      savedKeyRef.current = faqKey(tagged);
      if (aliveRef.current) setItems(tagged);
    } else {
      savedKeyRef.current = key;
    }
    if (!aliveRef.current) return;
    setSaveState(faqKey(itemsRef.current) === savedKeyRef.current ? "saved" : "idle");
  }

  const statusText = error
    ? error
    : saveState === "saving"
      ? "Guardando…"
      : saveState === "saved"
        ? "Guardado"
        : "Los cambios se guardan solos.";
  const statusClass = error
    ? "status status--error"
    : saveState === "saving"
      ? "status status--saving"
      : saveState === "saved"
        ? "status status--ok"
        : "status";

  return (
    <main className="editor">
      <aside className="faq-note">
        <h1>Preguntas frecuentes</h1>
        {missing ? (
          <p>No existe esa landing. <Link to="/landings">Volver al listado</Link></p>
        ) : (
          <>
            <p>
              Página aparte de esta landing. En la landing se abre desde el menú o desde el botón Preguntas frecuentes.
            </p>
            <p className="hint">
              <Link to={`/landings/${slug}`}>Volver a la landing</Link>
              {" · "}
              HTML exportado: <a href={`/export/${slug}/preguntas/`} target="_blank" rel="noreferrer">/{slug}/preguntas/</a>
            </p>
            {site ? (
              <>
                <p className={statusClass} role="status">
                  {saveState === "saving" && !error ? <Spinner /> : null}
                  {statusText}
                </p>
                <FaqJsonEditor items={items} onChange={commit} />
              </>
            ) : null}
            {!site && !error && !missing ? <p className="hint">Cargando…</p> : null}
          </>
        )}
      </aside>
      <section className={`preview preview--faq preview--${viewport}`}>
        <div className="preview__modes" role="group" aria-label="Tamaño de la vista previa">
          <button type="button" aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}>
            Escritorio
          </button>
          <button type="button" aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}>
            Celular
          </button>
        </div>
        {site ? (
          <DevicePreview viewport={viewport} site={site}>
            <FaqPageView items={items} logoSrc="/logo-renova.png" showEmpty />
          </DevicePreview>
        ) : null}
      </section>
    </main>
  );
}
