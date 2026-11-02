import { useEffect, useId, useRef, useState } from "react";
import { slugFromName } from "../../shared/content.js";
import { Spinner } from "./Spinner.jsx";

export function NewLandingModal({ onClose, onCreate }) {
  const titleId = useId();
  const inputRef = useRef(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const slug = slugFromName(name);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate(name);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={onSubmit}>
          <h2 id={titleId}>Nueva página</h2>
          <label>
            Nombre
            <input
              ref={inputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Flota de camiones"
              autoComplete="off"
              required
            />
          </label>
          <p className="hint">{slug ? `La página va a quedar en /${slug}/` : "Escribí el nombre de la página."}</p>
          <div className="actions">
            <button type="submit" disabled={busy || !slug}>
              {busy ? <Spinner /> : null}
              {busy ? "Creando" : "Crear"}
            </button>
            <button type="button" className="quiet" onClick={onClose} disabled={busy}>Cancelar</button>
          </div>
          <p className={error ? "status status--error" : "status"} role="status">{error}</p>
        </form>
      </div>
    </div>
  );
}
