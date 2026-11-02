import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { applyTerms, getTerms, proposeTerms } from "../api.js";
import { Spinner } from "../components/Spinner.jsx";

function decodeFile(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

function Change({ checked, onToggle, title, children }) {
  return (
    <section className="terms__change">
      <label className="terms__check">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span>{title}</span>
      </label>
      {children}
    </section>
  );
}

function Diff({ label, before, after }) {
  return (
    <div className="terms__diff">
      <p className="terms__label">{label}</p>
      <div className="terms__pair">
        <div className="terms__before">
          <span>Antes</span>
          <p>{before || "(vacío)"}</p>
        </div>
        <div className="terms__after">
          <span>Después</span>
          <p>{after || "(vacío)"}</p>
        </div>
      </div>
    </div>
  );
}

export function TermsPage() {
  const { slug } = useParams();
  const [ai, setAi] = useState(null);
  const [history, setHistory] = useState([]);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);
  const [picked, setPicked] = useState({});
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setResult(null);
    setError("");
    setNote("");
    getTerms(slug)
      .then((data) => {
        if (!active) return;
        setAi(data.ai);
        setHistory(data.history.runs.slice().reverse());
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  async function onFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const content = decodeFile(await file.arrayBuffer());
      setText(content);
      setFileName(file.name);
      setError("");
    } catch {
      setError("No se pudo leer el archivo");
    }
  }

  async function onAnalyze() {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError("");
    setNote("");
    setResult(null);
    try {
      const data = await proposeTerms(slug, text);
      if (!aliveRef.current) return;
      setResult(data);
      setPicked({
        hero: Boolean(data.proposal.hero),
        libre: Boolean(data.proposal.libre),
        faq: Boolean(data.proposal.faq),
      });
    } catch (err) {
      if (aliveRef.current) setError(err.message);
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  }

  async function onApply() {
    if (!result || applying) return;
    const fields = {};
    if (picked.hero && result.proposal.hero) fields.hero = result.proposal.hero;
    if (picked.libre && result.proposal.libre) fields.libre = result.proposal.libre;
    if (picked.faq && result.proposal.faq) fields.faq = result.proposal.faq;
    if (!Object.keys(fields).length) {
      setError("Elegí al menos un cambio para aplicar");
      return;
    }
    setApplying(true);
    setError("");
    try {
      await applyTerms(slug, fields, result.terms);
      if (!aliveRef.current) return;
      setNote("Cambios aplicados en la landing. Revisalos en el editor y publicá cuando quieras.");
      setResult(null);
      const data = await getTerms(slug);
      if (aliveRef.current) setHistory(data.history.runs.slice().reverse());
    } catch (err) {
      if (aliveRef.current) setError(err.message);
    } finally {
      if (aliveRef.current) setApplying(false);
    }
  }

  function toggle(key) {
    setPicked((current) => ({ ...current, [key]: !current[key] }));
  }

  const proposal = result ? result.proposal : null;
  const current = result ? result.current : null;
  const hasProposal = proposal && (proposal.hero || proposal.libre || proposal.faq);

  return (
    <main className="page terms">
      <h1>Términos de búsqueda</h1>
      <p className="lede">
        Subí el reporte de términos de búsqueda de Google Ads de la landing <strong>{slug}</strong>. La IA propone textos
        que coincidan con lo que se busca y vos elegís qué aplicar.{" "}
        <Link to={`/landings/${slug}`}>Volver a la landing</Link>
      </p>

      {ai && !ai.configured ? (
        <p className="status status--error">
          Falta la clave de la IA. Copiá <code>studio/.env.example</code> como <code>studio/.env</code>, pegá tu clave de
          Anthropic u OpenAI y reiniciá el editor.
        </p>
      ) : null}

      <div className="terms__input">
        <label className="terms__file">
          <span>Archivo CSV de Google Ads</span>
          <input type="file" accept=".csv,.tsv,.txt" onChange={onFile} />
          {fileName ? <em>{fileName}</em> : null}
        </label>
        <label className="terms__paste">
          <span>O pegá los términos, uno por línea</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            spellCheck={false}
            placeholder={"distribuidor de aceites y lubricantes\naceite 15w40 por tambor\nmayorista de lubricantes"}
          />
        </label>
        <div className="terms__actions">
          <button type="button" className="topbar__publish" onClick={onAnalyze} disabled={busy || !text.trim() || (ai && !ai.configured)}>
            {busy ? <Spinner /> : null}
            {busy ? "Analizando" : "Analizar términos"}
          </button>
        </div>
      </div>

      {error ? <p className="status status--error" role="alert">{error}</p> : null}
      {note ? <p className="status status--ok" role="status">{note}</p> : null}

      {result ? (
        <section className="terms__result">
          <h2>Términos leídos ({result.terms.length})</h2>
          <p className="hint">
            {result.terms.slice(0, 12).map((item) => item.term).join(" · ")}
            {result.terms.length > 12 ? " …" : ""}
          </p>

          <h2>Cambios propuestos</h2>
          {!hasProposal ? <p className="hint">La IA no propuso cambios válidos. Probá de nuevo.</p> : null}

          {proposal.hero ? (
            <Change checked={Boolean(picked.hero)} onToggle={() => toggle("hero")} title="Inicio (título, antetítulo y bajada)">
              <Diff label="Antetítulo" before={current.hero.eyebrow} after={proposal.hero.eyebrow} />
              <Diff label="Título" before={current.hero.heading} after={proposal.hero.heading} />
              <Diff label="Bajada" before={current.hero.subhead} after={proposal.hero.subhead} />
            </Change>
          ) : null}

          {proposal.libre ? (
            <Change checked={Boolean(picked.libre)} onToggle={() => toggle("libre")} title="Espacio libre">
              <Diff label="Título" before={current.libre.heading} after={proposal.libre.heading} />
              <Diff label="Texto" before={current.libre.text} after={proposal.libre.text} />
              <div className="terms__diff">
                <p className="terms__label">Tarjetas</p>
                <div className="terms__pair">
                  <div className="terms__before">
                    <span>Antes</span>
                    <ul>
                      {(current.libre.cards || []).map((card, index) => (
                        <li key={index}><strong>{card.title}</strong>{card.text ? `: ${card.text}` : ""}</li>
                      ))}
                    </ul>
                    {!(current.libre.cards || []).length ? <p>(vacío)</p> : null}
                  </div>
                  <div className="terms__after">
                    <span>Después</span>
                    <ul>
                      {(proposal.libre.cards || []).map((card, index) => (
                        <li key={index}><strong>{card.title}</strong>{card.text ? `: ${card.text}` : ""}</li>
                      ))}
                    </ul>
                    {!(proposal.libre.cards || []).length ? <p>(vacío)</p> : null}
                  </div>
                </div>
              </div>
            </Change>
          ) : null}

          {proposal.faq ? (
            <Change
              checked={Boolean(picked.faq)}
              onToggle={() => toggle("faq")}
              title={`Preguntas frecuentes (${current.faq.length} antes, ${proposal.faq.length} después)`}
            >
              <div className="terms__pair">
                <div className="terms__before">
                  <span>Antes</span>
                  <ul>
                    {current.faq.map((item, index) => <li key={index}>{item.question}</li>)}
                  </ul>
                </div>
                <div className="terms__after">
                  <span>Después</span>
                  <ul>
                    {proposal.faq.map((item, index) => <li key={index}>{item.question}</li>)}
                  </ul>
                </div>
              </div>
            </Change>
          ) : null}

          {result.notes ? <p className="hint">{result.notes}</p> : null}

          {result.discarded.length ? (
            <div className="terms__discarded">
              <h2>Términos descartados</h2>
              <p className="hint">Conviene cargarlos como palabras clave negativas en Google Ads.</p>
              <ul>
                {result.discarded.map((item, index) => (
                  <li key={index}><strong>{item.term}</strong>{item.motivo ? `: ${item.motivo}` : ""}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasProposal ? (
            <div className="terms__actions">
              <button type="button" className="topbar__publish" onClick={onApply} disabled={applying}>
                {applying ? <Spinner /> : null}
                {applying ? "Aplicando" : "Aplicar lo elegido"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {history.length ? (
        <section className="terms__history">
          <h2>Historial</h2>
          <ul>
            {history.map((run) => (
              <li key={run.at}>
                {formatDate(run.at)}: {run.terms.length} términos, se aplicó {run.applied.join(", ")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
