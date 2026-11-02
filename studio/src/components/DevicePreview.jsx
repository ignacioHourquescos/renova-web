import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import heroCss from "../hero.css?inline";
import { themeVars } from "../../shared/content.js";

const FRAME = `<!DOCTYPE html><html><head><meta charset="utf-8"><style id="preview-css"></style></head><body></body></html>`;

export function DevicePreview({ viewport, site, children }) {
  const [iframe, setIframe] = useState(null);
  const [body, setBody] = useState(null);

  useEffect(() => {
    if (!iframe) return undefined;
    let alive = true;

    const mount = () => {
      const doc = iframe.contentDocument;
      if (!doc || !alive) return;
      let style = doc.getElementById("preview-css");
      if (!style) {
        doc.open();
        doc.write(FRAME);
        doc.close();
        style = doc.getElementById("preview-css");
      }
      if (style && style.textContent !== heroCss) style.textContent = heroCss;
      setBody(doc.body);
    };

    mount();
    iframe.addEventListener("load", mount);
    return () => {
      alive = false;
      iframe.removeEventListener("load", mount);
      setBody(null);
    };
  }, [iframe, heroCss]);

  useEffect(() => {
    if (!body || !site) return;
    const root = body.ownerDocument.documentElement;
    for (const [key, value] of Object.entries(themeVars(site))) {
      root.style.setProperty(key, value);
    }
  }, [body, site]);

  return (
    <div className={`preview__stage${viewport === "mobile" ? " preview__stage--mobile" : ""}`}>
      <iframe
        ref={setIframe}
        className="preview__iframe"
        title="Vista previa"
      />
      {body ? createPortal(children, body) : null}
    </div>
  );
}
