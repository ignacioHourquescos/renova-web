import { useState } from "react";
import { CLIENT_COUNT } from "../../shared/content.js";
import { mediaUrl } from "../api.js";

const MAX_BYTES = 2 * 1024 * 1024;

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

function createId(logos) {
  const used = new Set(logos.map((logo) => logo.id));
  let id = "";
  do {
    id = `c-${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
  } while (used.has(id));
  return id;
}

function nameFromFile(file) {
  return file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function clientLogoSrc(logo, version) {
  if (logo?.imageDataUrl) return logo.imageDataUrl;
  const file = String(logo?.file || "");
  if (file.startsWith("images/")) return mediaUrl(file, version);
  if (file) return `/clients/${file}`;
  return "";
}

function checkFile(file) {
  if (!file) return "";
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return "El icono tiene que ser JPG, PNG o WebP";
  if (file.size > MAX_BYTES) return "El icono supera 2 MB";
  return "";
}

export function ClientsEditor({ logos, version, onChange, onError }) {
  const [reading, setReading] = useState(false);
  const items = Array.isArray(logos) ? logos : [];

  async function onAdd(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (items.length >= CLIENT_COUNT) {
      onError(`Podés cargar hasta ${CLIENT_COUNT} iconos`);
      return;
    }
    const problem = checkFile(file);
    if (problem) {
      onError(problem);
      return;
    }
    setReading(true);
    try {
      const imageDataUrl = await readImage(file);
      onChange(items.concat({
        id: createId(items),
        alt: nameFromFile(file),
        file: "",
        imageDataUrl,
      }), true);
    } catch (err) {
      onError(err.message);
    } finally {
      setReading(false);
    }
  }

  async function onReplace(id, event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const problem = checkFile(file);
    if (problem) {
      onError(problem);
      return;
    }
    setReading(true);
    try {
      const imageDataUrl = await readImage(file);
      onChange(items.map((logo) => (
        logo.id === id ? { ...logo, imageDataUrl } : logo
      )), true);
    } catch (err) {
      onError(err.message);
    } finally {
      setReading(false);
    }
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next, false);
  }

  return (
    <div className="client-logos">
      {items.length ? (
        <ul aria-label="Iconos de clientes">
          {items.map((logo, index) => {
            const label = logo.alt || "icono";
            return (
              <li className="client-logo" key={logo.id}>
                <img src={clientLogoSrc(logo, version)} alt="" />
                <label className="client-logo__name">
                  <span className="sr-only">Nombre de {label}</span>
                  <input
                    value={logo.alt}
                    maxLength={80}
                    placeholder="Nombre"
                    onChange={(event) => {
                      const alt = event.target.value;
                      onChange(items.map((item) => (item.id === logo.id ? { ...item, alt } : item)), false);
                    }}
                  />
                </label>
                <div className="client-logo__actions">
                  <button
                    type="button"
                    className="client-logo__action"
                    disabled={index === 0}
                    aria-label={`Mover ${label} hacia arriba`}
                    onClick={() => move(index, -1)}
                  >
                    Arriba
                  </button>
                  <button
                    type="button"
                    className="client-logo__action"
                    disabled={index === items.length - 1}
                    aria-label={`Mover ${label} hacia abajo`}
                    onClick={() => move(index, 1)}
                  >
                    Abajo
                  </button>
                  <label className="client-logo__action">
                    Cambiar
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={`Cambiar icono de ${label}`}
                      onChange={(event) => onReplace(logo.id, event)}
                    />
                  </label>
                  <button
                    type="button"
                    className="client-logo__action client-logo__action--remove"
                    aria-label={`Quitar ${label}`}
                    onClick={() => onChange(items.filter((item) => item.id !== logo.id), false)}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="hint">No hay iconos. La franja queda vacía.</p>
      )}
      {items.length >= CLIENT_COUNT ? (
        <p className="hint">Llegaste al máximo de {CLIENT_COUNT} iconos.</p>
      ) : (
        <label className="client-logo__action client-logo__add">
          {reading ? "Leyendo icono…" : "Agregar icono"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={reading}
            onChange={onAdd}
          />
        </label>
      )}
    </div>
  );
}
