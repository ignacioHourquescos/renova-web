import { useEffect, useMemo, useRef, useState } from "react";
import { DESTACADOS_COUNT } from "../../shared/destacados.js";

function rank(product, needle) {
  const code = String(product.code || "").toLowerCase();
  const title = String(product.title || "").toLowerCase();
  const brand = String(product.brand || "").toLowerCase();
  const detail = String(product.detail || "").toLowerCase();
  if (!needle) return 99;
  if (code === needle) return 0;
  if (code.startsWith(needle)) return 1;
  if (title.startsWith(needle)) return 2;
  if (code.includes(needle)) return 3;
  if (title.includes(needle)) return 4;
  if (brand.includes(needle)) return 5;
  if (detail.includes(needle)) return 6;
  return 99;
}

function optionId(id) {
  return `product-option-${String(id).replace(/[^\p{L}\p{N}_-]/gu, "_")}`;
}

function label(product) {
  return product.brand ? `${product.brand} — ${product.title}` : product.title;
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

export function ProductPicker({ catalog, selected, onAdd, onAddCustom, onRemove, note }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [customTitle, setCustomTitle] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [customImage, setCustomImage] = useState("");
  const [customError, setCustomError] = useState("");
  const boxRef = useRef(null);
  const full = selected.length >= DESTACADOS_COUNT;
  const selectedIds = useMemo(() => new Set(selected.map((product) => product.id)), [selected]);
  const results = useMemo(() => {
    if (full) return [];
    const needle = query.trim().toLowerCase();
    return catalog
      .filter((product) => !selectedIds.has(product.id) && rank(product, needle) < 99)
      .sort((a, b) => rank(a, needle) - rank(b, needle) || a.title.localeCompare(b.title, "es"))
      .slice(0, 8);
  }, [catalog, selectedIds, query, full]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    function onPointer(event) {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  function choose(product) {
    if (!product || full) return;
    onAdd(product.id);
    setQuery("");
    setOpen(false);
  }

  async function onCustomImage(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setCustomError("");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setCustomError("La imagen tiene que ser JPG, PNG o WebP");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setCustomError("La imagen supera 8 MB");
      return;
    }
    try {
      setCustomImage(await readImage(file));
    } catch (err) {
      setCustomError(err.message);
    }
  }

  function addCustom() {
    const title = customTitle.trim();
    if (!title || !customImage || full) return;
    onAddCustom({
      title,
      brand: customBrand.trim(),
      imageDataUrl: customImage,
    });
    setCustomTitle("");
    setCustomBrand("");
    setCustomImage("");
    setCustomError("");
  }

  function onKeyDown(event) {
    if (event.key === "Enter") event.preventDefault();
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      choose(results[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="product-picker">
      <p className="hint">
        Cada landing tiene sus propios destacados. Buscá en el listado de la API o cargá una imagen con descripción. Hasta {DESTACADOS_COUNT}, sin precio.
      </p>
      {note ? <p className="hint">{note}</p> : null}
      <div className="product-search" ref={boxRef}>
        <input
          type="search"
          value={query}
          disabled={full || !catalog.length}
          placeholder={full ? "Ya elegiste 8 productos" : "Buscar artículo"}
          aria-label="Buscar artículo"
          aria-expanded={open && results.length > 0}
          aria-controls="product-search-results"
          aria-activedescendant={open && results[highlight] ? optionId(results[highlight].id) : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {open && query.trim() && !results.length && !full ? (
          <p className="product-search__empty">Ningún artículo coincide.</p>
        ) : null}
        {open && results.length ? (
          <ul className="product-search__menu" id="product-search-results" role="listbox">
            {results.map((product, index) => (
              <li key={product.id}>
                <button
                  type="button"
                  id={optionId(product.id)}
                  role="option"
                  aria-selected={index === highlight}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(product)}
                >
                  <span>{label(product)}</span>
                  {product.code || product.detail ? (
                    <span className="product-search__code">
                      {[product.code, product.detail].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <fieldset className="custom-product">
        <legend>Producto propio</legend>
        <label className="float-field float-field--file">
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={full} onChange={onCustomImage} />
          <span>Imagen</span>
        </label>
        {customImage ? <img className="thumb custom-product__thumb" src={customImage} alt="" /> : null}
        <label className="float-field">
          <input
            value={customBrand}
            disabled={full}
            placeholder=" "
            onChange={(event) => setCustomBrand(event.target.value)}
          />
          <span>Marca</span>
        </label>
        <label className="float-field">
          <textarea
            value={customTitle}
            disabled={full}
            placeholder=" "
            onChange={(event) => setCustomTitle(event.target.value)}
          />
          <span>Descripción</span>
        </label>
        {customError ? <p className="hint">{customError}</p> : null}
        <button type="button" onClick={addCustom} disabled={full || !customTitle.trim() || !customImage}>
          Agregar producto propio
        </button>
      </fieldset>
      <p className="hint">{selected.length} de {DESTACADOS_COUNT}</p>
      {selected.length ? (
        <ol className="destacados-list product-picked">
          {selected.map((product) => (
            <li key={product.id}>
              <span>{label(product)}{product.source === "custom" ? " · Propio" : ""}</span>
              <button type="button" className="product-picked__remove" onClick={() => onRemove(product.id)}>
                Quitar
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="hint">Todavía no hay productos elegidos.</p>
      )}
    </div>
  );
}
