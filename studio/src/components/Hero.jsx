import { useEffect, useRef, useState } from "react";
import { isSafeHref } from "../../shared/content.js";

function ctaProps(href) {
  if (!href || !isSafeHref(href)) return null;
  if (/^https?:/i.test(href)) {
    return { href, target: "_blank", rel: "noopener noreferrer" };
  }
  return { href };
}

export function PageCta({ label, href, tone = "band" }) {
  const text = String(label ?? "").trim();
  if (!text) return null;
  const link = ctaProps(String(href ?? "").trim());
  const className = tone === "inline" ? "page-cta page-cta--inline" : "page-cta";
  return (
    <div className={className}>
      {link ? <a className="hero__cta" {...link}>{text}</a> : <span className="hero__cta">{text}</span>}
    </div>
  );
}

export const HOME_HREF = "https://www.distribuidorarenova.com.ar";
export const FAQ_HREF = "preguntas/";
const LISTAS_HREF = "https://www.distribuidorarenova.com.ar/views/html/listas";
const NAV_SOLID_AT = 12;

const NAV_SCRIPT = `(function(){
  var nav = document.currentScript && document.currentScript.parentElement;
  if (!nav || nav.dataset.live === "1") return;
  function paint() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    nav.classList.toggle("is-solid", y > ${NAV_SOLID_AT});
  }
  paint();
  window.addEventListener("scroll", paint, { passive: true });
})();`;

export function Hero({ site, hero, imageUrl, logoSrc = "/logo-renova.png", faqHref = FAQ_HREF, faqTarget }) {
  const style = imageUrl
    ? {
        backgroundImage: `linear-gradient(var(--color-overlay), var(--color-overlay)), url("${imageUrl}")`,
      }
    : undefined;
  const link = ctaProps(hero.ctaHref);
  const brand = site.brand || "RENOVA";
  const faqLink = { href: faqHref };
  if (faqTarget) faqLink.target = faqTarget;
  const navRef = useRef(null);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    nav.dataset.live = "1";
    const view = nav.ownerDocument.defaultView || window;
    const paint = () => {
      const y = view.scrollY || nav.ownerDocument.documentElement.scrollTop || 0;
      const next = y > NAV_SOLID_AT;
      setSolid((current) => (current === next ? current : next));
    };
    paint();
    view.addEventListener("scroll", paint, { passive: true });
    return () => view.removeEventListener("scroll", paint);
  }, []);

  return (
    <section className="hero" style={style}>
      <header ref={navRef} className={solid ? "site-nav is-solid" : "site-nav"}>
        <a className="site-nav__brand" href={HOME_HREF}>
          <img src={logoSrc} alt={brand} />
        </a>
        <nav className="site-nav__links" aria-label="Secciones">
          <a {...faqLink}>Preguntas frecuentes</a>
          <a href={LISTAS_HREF}>Listas</a>
        </nav>
        <details className="site-nav__menu">
          <summary className="site-nav__burger" aria-label="Menú">
            <span className="site-nav__burger-icon" />
          </summary>
          <nav className="site-nav__panel" aria-label="Secciones">
            <a {...faqLink}>Preguntas frecuentes</a>
            <a href={LISTAS_HREF}>Listas</a>
          </nav>
        </details>
        <script dangerouslySetInnerHTML={{ __html: NAV_SCRIPT }} />
      </header>
      <div className="hero__content">
        {hero.eyebrow ? <p className="hero__eyebrow">{hero.eyebrow}</p> : null}
        <h1>{hero.heading}</h1>
        {hero.subhead ? <p className="hero__subhead">{hero.subhead}</p> : null}
        {hero.ctaLabel ? (
          link ? (
            <a className="hero__cta" {...link}>{hero.ctaLabel}</a>
          ) : (
            <span className="hero__cta">{hero.ctaLabel}</span>
          )
        ) : null}
      </div>
    </section>
  );
}
