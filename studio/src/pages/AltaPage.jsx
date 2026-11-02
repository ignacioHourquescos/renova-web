import { useEffect, useState } from "react";
import { getSite } from "../api.js";
import { AltaCliente } from "../components/AltaCliente.jsx";
import { DevicePreview } from "../components/DevicePreview.jsx";

export function AltaPage() {
  const [site, setSite] = useState(null);
  const [error, setError] = useState("");
  const [viewport, setViewport] = useState("desktop");

  useEffect(() => {
    let active = true;
    getSite()
      .then((data) => {
        if (active) setSite(data.site);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="editor">
      <aside className="alta-note">
        <h1>Alta de cliente</h1>
        <p>
          Formulario para dar de alta un cliente mayorista. Pide razón social, CUIT, condición frente al IVA, contacto, domicilio fiscal y dirección de entrega.
        </p>
        <p>Al enviarlo se abre WhatsApp con esos datos.</p>
        <p className="hint">
          HTML exportado: <a href="/export/alta/" target="_blank" rel="noreferrer">/alta/</a>
        </p>
        {error ? <p className="status status--error" role="status">{error}</p> : null}
        {!site && !error ? <p className="hint">Cargando…</p> : null}
      </aside>
      <section className={`preview preview--alta preview--${viewport}`}>
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
            <AltaCliente logoSrc="/logo-renova.png" phone={site.alta?.whatsapp || ""} />
          </DevicePreview>
        ) : null}
      </section>
    </main>
  );
}
