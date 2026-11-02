import { useEffect, useRef, useState } from "react";
import { isSafeHref } from "../../shared/content.js";
import { SectionTitle } from "./SectionTitle.jsx";

function pad(value) {
  return String(value).padStart(2, "0");
}

function stepSize(track) {
  const card = track.querySelector("[data-carousel-card]");
  if (!card) return track.clientWidth || 1;
  const styles = window.getComputedStyle(track);
  const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
  return card.getBoundingClientRect().width + gap;
}

function bindCarousel(root, onIndex) {
  if (!root || root.getAttribute("data-carousel-bound") === "1") return () => {};
  const track = root.querySelector("[data-carousel-track]");
  const indexNode = root.querySelector("[data-carousel-index]");
  if (!track) return () => {};
  root.setAttribute("data-carousel-bound", "1");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function update() {
    const total = track.querySelectorAll("[data-carousel-card]").length || 1;
    let index = Math.round(track.scrollLeft / stepSize(track)) + 1;
    if (!Number.isFinite(index) || index < 1) index = 1;
    if (index > total) index = total;
    if (onIndex) onIndex(index);
    else if (indexNode) indexNode.textContent = pad(index);
  }

  function go(direction) {
    const amount = stepSize(track);
    const total = track.querySelectorAll("[data-carousel-card]").length;
    const current = Math.round(track.scrollLeft / amount);
    const next = Math.min(total - 1, Math.max(0, current + direction));
    track.scrollTo({
      left: next * amount,
      behavior: reduce.matches ? "auto" : "smooth",
    });
  }

  function onPrev() {
    go(-1);
  }

  function onNext() {
    go(1);
  }

  function onKey(event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  }

  const prevs = Array.from(root.querySelectorAll("[data-carousel-prev]"));
  const nexts = Array.from(root.querySelectorAll("[data-carousel-next]"));
  prevs.forEach((node) => node.addEventListener("click", onPrev));
  nexts.forEach((node) => node.addEventListener("click", onNext));
  track.addEventListener("scroll", update, { passive: true });
  track.addEventListener("keydown", onKey);
  update();

  return () => {
    root.removeAttribute("data-carousel-bound");
    prevs.forEach((node) => node.removeEventListener("click", onPrev));
    nexts.forEach((node) => node.removeEventListener("click", onNext));
    track.removeEventListener("scroll", update);
    track.removeEventListener("keydown", onKey);
  };
}

const CAROUSEL_SCRIPT = `(function(){
  function pad(value){ return String(value).padStart(2, "0"); }
  function stepSize(track){
    var card = track.querySelector("[data-carousel-card]");
    if (!card) return track.clientWidth || 1;
    var styles = window.getComputedStyle(track);
    var gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return card.getBoundingClientRect().width + gap;
  }
  function bind(root){
    if (root.getAttribute("data-carousel-bound") === "1") return;
    var track = root.querySelector("[data-carousel-track]");
    var indexNode = root.querySelector("[data-carousel-index]");
    if (!track) return;
    root.setAttribute("data-carousel-bound", "1");
    function update(){
      var total = track.querySelectorAll("[data-carousel-card]").length || 1;
      var index = Math.round(track.scrollLeft / stepSize(track)) + 1;
      if (!isFinite(index) || index < 1) index = 1;
      if (index > total) index = total;
      if (indexNode) indexNode.textContent = pad(index);
    }
    function go(direction){
      var amount = stepSize(track);
      var total = track.querySelectorAll("[data-carousel-card]").length;
      var current = Math.round(track.scrollLeft / amount);
      var next = Math.min(total - 1, Math.max(0, current + direction));
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({ left: next * amount, behavior: reduce ? "auto" : "smooth" });
    }
    var prevs = root.querySelectorAll("[data-carousel-prev]");
    var nexts = root.querySelectorAll("[data-carousel-next]");
    for (var i = 0; i < prevs.length; i++) prevs[i].addEventListener("click", function(){ go(-1); });
    for (var j = 0; j < nexts.length; j++) nexts[j].addEventListener("click", function(){ go(1); });
    track.addEventListener("keydown", function(event){
      if (event.key === "ArrowRight") { event.preventDefault(); go(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
    });
    track.addEventListener("scroll", update, { passive: true });
    update();
  }
  var nodes = document.querySelectorAll("[data-carousel]");
  for (var n = 0; n < nodes.length; n++) bind(nodes[n]);
})();`;

function Chevron({ direction }) {
  const left = direction === "left";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={left ? "M14.5 6.5 9 12l5.5 5.5" : "M9.5 6.5 15 12l-5.5 5.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 16 16 8M10 8h6v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function slideCopy(carousel) {
  const source = carousel && typeof carousel === "object" ? carousel : {};
  const slides = (Array.isArray(source.slides) ? source.slides : [])
    .map((slide) => {
      const href = String(slide?.href ?? "").trim();
      return {
        id: String(slide?.id ?? ""),
        label: String(slide?.label ?? "").trim(),
        text: String(slide?.text ?? "").trim(),
        href: isSafeHref(href) ? href : "",
        src: String(slide?.src || slide?.imageDataUrl || "").trim(),
      };
    })
    .filter((slide) => slide.src);
  return {
    eyebrow: String(source.eyebrow ?? "").trim(),
    line1: String(source.line1 ?? "").trim(),
    line1Muted: String(source.line1Muted ?? "").trim(),
    slides,
  };
}

export function Carousel({ carousel = {}, showEmpty = false, live = false }) {
  const rootRef = useRef(null);
  const [index, setIndex] = useState(1);
  const copy = slideCopy(carousel);
  const { eyebrow, line1, line1Muted, slides } = copy;
  const hasTitle = Boolean(line1 || line1Muted);
  const hasCopy = Boolean(eyebrow || hasTitle);

  useEffect(() => {
    if (!live) return undefined;
    return bindCarousel(rootRef.current, setIndex);
  }, [live, slides.length]);

  if (!hasCopy && !slides.length && !showEmpty) return null;

  return (
    <section
      className="carousel"
      data-carousel="true"
      ref={rootRef}
      aria-labelledby={hasTitle ? "carousel-title" : undefined}
      aria-label={hasTitle ? undefined : "Carrusel"}
    >
      {hasCopy || slides.length > 1 ? (
        <div className="carousel__top">
          {hasTitle || eyebrow || slides.length > 1 ? (
            <div className="carousel__head">
              {hasTitle || eyebrow ? (
                <SectionTitle id={hasTitle ? "carousel-title" : undefined} eyebrow={eyebrow} title={line1} subtitle={line1Muted} />
              ) : <span />}
              {slides.length > 1 ? (
                <div className="carousel__controls">
                  <span className="carousel__total">{pad(slides.length)}/</span>
                  <button type="button" className="carousel__btn" data-carousel-prev aria-label="Imagen anterior">
                    <Chevron direction="left" />
                  </button>
                  <button type="button" className="carousel__btn carousel__btn--next" data-carousel-next aria-label="Imagen siguiente">
                    <Chevron direction="right" />
                  </button>
                  <span className="carousel__index" data-carousel-index>{pad(index)}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {slides.length ? (
        <div className="carousel__scroller">
          <div
            className="carousel__track"
            data-carousel-track
            tabIndex={0}
            role="region"
            aria-label="Imágenes"
          >
            {slides.map((slide) => (
              <article className="carousel__card" data-carousel-card key={slide.id || slide.src}>
                <div className="carousel__media">
                  <img src={slide.src} alt={slide.label ? "" : "Imagen"} loading="lazy" decoding="async" />
                  {slide.label ? <p className="carousel__label">{slide.label}</p> : null}
                  {slide.href ? (
                    <a className="carousel__go" href={slide.href} aria-label={slide.label ? `Ver ${slide.label}` : "Abrir"}>
                      <ArrowIcon />
                    </a>
                  ) : (
                    <span className="carousel__go" aria-hidden="true">
                      <ArrowIcon />
                    </span>
                  )}
                </div>
                {slide.text ? <p className="carousel__caption">{slide.text}</p> : null}
              </article>
            ))}
          </div>
          {slides.length > 1 ? (
            <button type="button" className="carousel__edge" data-carousel-next tabIndex={-1} aria-hidden="true">
              <Chevron direction="right" />
            </button>
          ) : null}
        </div>
      ) : (
        <p className="carousel__empty">El carrusel de esta landing va a aparecer acá.</p>
      )}
      {!live && slides.length > 1 ? <script dangerouslySetInnerHTML={{ __html: CAROUSEL_SCRIPT }} /> : null}
    </section>
  );
}
