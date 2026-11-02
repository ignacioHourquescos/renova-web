import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "./Spinner.jsx";

export function PublishModal({ busy, error, onConfirm, onClose }) {
  const titleId = useId();
  const copyId = useId();
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <div
        className="modal modal--publish"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={copyId}
        aria-busy={busy || undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__bar" aria-hidden="true">
          {busy ? <span className="modal__bar-run" /> : null}
        </div>
        <div className="modal__panel">
          <div className="modal__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16V5m0 0 4.5 4.5M12 5 7.5 9.5M5 19h14"
              />
            </svg>
          </div>
          <h2 id={titleId}>Publicar páginas</h2>
          <p id={copyId} className="modal__copy">
            Se exportan las páginas, las preguntas frecuentes y el formulario de alta, y se suben a GitHub.
          </p>
          {busy ? (
            <p className="modal__wait" role="status">
              <Spinner />
              Exportando y subiendo…
            </p>
          ) : null}
          {error ? (
            <p className="modal__error" role="alert">{error}</p>
          ) : null}
          <div className="modal__actions">
            <button type="button" className="quiet" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="modal__go"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? <Spinner /> : null}
              {busy ? "Publicando" : "Publicar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
