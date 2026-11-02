import { useState } from "react";
import { CAROUSEL_COUNT } from "../../shared/content.js";
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

function createId(slides) {
  const used = new Set(slides.map((slide) => slide.id));
  let id = "";
  do {
    id = `s-${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
  } while (used.has(id));
  return id;
}

function nameFromFile(file) {
  return file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
}

function checkFile(file) {
  if (!file) return "";
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return "La imagen tiene que ser JPG, PNG o WebP";
  if (file.size > MAX_BYTES) return "La imagen supera 2 MB";
  return "";
}

function slideSrc(slide, version) {
  if (slide?.imageDataUrl) return slide.imageDataUrl;
  if (slide?.image) return mediaUrl(slide.image, version);
  return "";
}

export function CarouselEditor({ slides, version, onChange, onError }) {
  const [reading, setReading] = useState(false);
  const items = Array.isArray(slides) ? slides : [];

  function update(id, patch) {
    onChange(items.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)), false);
  }

  async function onAdd(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (items.length >= CAROUSEL_COUNT) {
      onError(`Podés cargar hasta ${CAROUSEL_COUNT} imágenes`);
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
        label: nameFromFile(file),
        text: "",
        href: "",
        image: "",
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
      onChange(items.map((slide) => (
        slide.id === id ? { ...slide, imageDataUrl } : slide
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
    <div className="carousel-slides">
      {items.length ? (
        <ul aria-label="Imágenes del carrusel">
          {items.map((slide, index) => {
            const label = slide.label || "imagen";
            return (
              <li className="carousel-slide" key={slide.id}>
                {slideSrc(slide, version) ? <img src={slideSrc(slide, version)} alt="" /> : null}
                <label className="carousel-slide__field">
                  <span>Nombre</span>
                  <input
                    value={slide.label}
                    maxLength={48}
                    onChange={(event) => update(slide.id, { label: event.target.value })}
                  />
                </label>
                <label className="carousel-slide__field">
                  <span>Texto sobre la imagen</span>
                  <textarea
                    value={slide.text}
                    maxLength={280}
                    onChange={(event) => update(slide.id, { text: event.target.value })}
                  />
                </label>
                <label className="carousel-slide__field">
                  <span>Link de la flecha</span>
                  <input
                    value={slide.href}
                    maxLength={500}
                    placeholder="https://"
                    onChange={(event) => update(slide.id, { href: event.target.value })}
                  />
                </label>
                <div className="client-logo__actions">
                  <button
                    type="button"
                    className="client-logo__action"
                    disabled={index === 0}
                    aria-label={`Mover ${label} hacia la izquierda`}
                    onClick={() => move(index, -1)}
                  >
                    Antes
                  </button>
                  <button
                    type="button"
                    className="client-logo__action"
                    disabled={index === items.length - 1}
                    aria-label={`Mover ${label} hacia la derecha`}
                    onClick={() => move(index, 1)}
                  >
                    Después
                  </button>
                  <label className="client-logo__action">
                    Cambiar
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={`Cambiar imagen de ${label}`}
                      onChange={(event) => onReplace(slide.id, event)}
                    />
                  </label>
                  <button
                    type="button"
                    className="client-logo__action client-logo__action--remove"
                    aria-label={`Quitar ${label}`}
                    onClick={() => onChange(items.filter((item) => item.id !== slide.id), true)}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="hint">Todavía no hay imágenes.</p>
      )}
      {items.length >= CAROUSEL_COUNT ? (
        <p className="hint">Llegaste al máximo de {CAROUSEL_COUNT} imágenes.</p>
      ) : (
        <label className="client-logo__action client-logo__add">
          {reading ? "Leyendo imagen…" : "Agregar imagen"}
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
