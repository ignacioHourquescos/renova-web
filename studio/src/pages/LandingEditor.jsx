import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDestacados, getSite, mediaUrl, saveLanding, saveSiteFooter } from "../api.js";
import { defaultCarousel, defaultClients, defaultCotizar, defaultFooter, isSafeHref, landingClients, moveSection, normalizeSections, sectionOrder, sectionVisible } from "../../shared/content.js";
import { withWhatsappPhone } from "../../shared/tracking.js";
import { DESTACADOS_COUNT, resolveDestacados } from "../../shared/destacados.js";
import { Clients } from "../components/Clients.jsx";
import { ClientsEditor } from "../components/ClientsEditor.jsx";
import { Marcas } from "../components/Marcas.jsx";
import { ComoCotizar } from "../components/ComoCotizar.jsx";
import { Formulario } from "../components/Formulario.jsx";
import { Destacados } from "../components/Destacados.jsx";
import { Diferencial } from "../components/Diferencial.jsx";
import { DevicePreview } from "../components/DevicePreview.jsx";
import { Buscabas } from "../components/Buscabas.jsx";
import { Footer, WhatsAppFloat } from "../components/Footer.jsx";
import { Hero } from "../components/Hero.jsx";
import { FaqLink } from "../components/Faq.jsx";
import { Carousel } from "../components/Carousel.jsx";
import { CarouselEditor } from "../components/CarouselEditor.jsx";
import { Libre } from "../components/Libre.jsx";
import { LocationMap } from "../components/LocationMap.jsx";
import { ProductPicker } from "../components/ProductPicker.jsx";
import { Spinner } from "../components/Spinner.jsx";

const EMPTY = {
  backgroundImage: "",
  eyebrow: "",
  heading: "",
  subhead: "",
  ctaLabel: "",
  ctaHref: "",
};

const SAVE_DELAY = 600;
const DRAWER_MS = 400;

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

function heroFields(hero) {
  return {
    eyebrow: hero.eyebrow,
    heading: hero.heading,
    subhead: hero.subhead,
    ctaLabel: hero.ctaLabel,
    ctaHref: hero.ctaHref,
  };
}

function heroKey(hero) {
  return JSON.stringify(heroFields(hero));
}

function footerFields(footer) {
  return {
    legalName: footer.legalName ?? "",
    taxId: footer.taxId ?? "",
    address: footer.address ?? "",
    privacyLabel: footer.privacyLabel ?? "",
    privacyHref: footer.privacyHref ?? "",
    privacyText: footer.privacyText ?? "",
    copyright: footer.copyright ?? "",
    whatsappHref: footer.whatsappHref ?? "",
  };
}

function footerKey(footer) {
  return JSON.stringify(footerFields(footer));
}

function idsKey(ids) {
  return JSON.stringify(ids);
}

function sectionsKey(sections) {
  return JSON.stringify(normalizeSections(sections));
}

function libreFields(libre) {
  return {
    heading: libre?.heading ?? "",
    text: libre?.text ?? "",
  };
}

function libreKey(libre) {
  return JSON.stringify(libreFields(libre));
}

function cotizarFields(cotizar) {
  const source = cotizar && typeof cotizar === "object" ? cotizar : defaultCotizar();
  const fallback = defaultCotizar();
  const stepsIn = Array.isArray(source.steps) ? source.steps : [];
  return {
    heading: source.heading ?? fallback.heading,
    lead: source.lead ?? fallback.lead,
    steps: fallback.steps.map((step, index) => ({
      title: stepsIn[index]?.title ?? step.title,
      text: stepsIn[index]?.text ?? step.text,
    })),
  };
}

function cotizarKey(cotizar) {
  return JSON.stringify(cotizarFields(cotizar));
}

function carouselFields(carousel) {
  const source = carousel && typeof carousel === "object" ? carousel : defaultCarousel();
  return {
    eyebrow: source.eyebrow ?? "",
    line1: source.line1 ?? "",
    line1Muted: source.line1Muted ?? "",
    slides: (Array.isArray(source.slides) ? source.slides : []).map((slide) => {
      const next = {
        id: slide?.id ?? "",
        label: slide?.label ?? "",
        text: slide?.text ?? "",
        href: slide?.href ?? "",
        image: slide?.image ?? "",
      };
      if (slide?.imageDataUrl) next.imageDataUrl = slide.imageDataUrl;
      return next;
    }),
  };
}

function carouselKey(carousel) {
  return JSON.stringify(carouselFields(carousel));
}

function clientsFields(logos) {
  return (Array.isArray(logos) ? logos : []).map((logo) => {
    const next = {
      id: logo?.id ?? "",
      alt: logo?.alt ?? "",
      file: logo?.file ?? "",
    };
    if (logo?.imageDataUrl) next.imageDataUrl = logo.imageDataUrl;
    return next;
  });
}

function clientsKey(logos) {
  return JSON.stringify(clientsFields(logos));
}

const SECTION_NAV = [
  { id: "hero", label: "Hero" },
  { id: "marcas", label: "Marcas" },
  { id: "diferencial", label: "Por qué Renova" },
  { id: "cotizar", label: "Cómo cotizar" },
  { id: "destacados", label: "Destacados" },
  { id: "carousel", label: "Carrusel" },
  { id: "libre", label: "Espacio libre" },
  { id: "clients", label: "Clientes" },
  { id: "formulario", label: "Formulario" },
  { id: "map", label: "Mapa" },
  { id: "faq", label: "Preguntas" },
  { id: "buscabas", label: "No es lo que buscabas" },
  { id: "footer", label: "Footer" },
];

function MoveIcon({ direction }) {
  const up = direction === "up";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d={up ? "M6 14.5 12 8.5l6 6" : "M6 9.5 12 15.5l6-6"}
      />
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z"
      />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4l16 16M9.88 5.24A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3.16 4.08M6.11 6.11C3.77 7.84 2 12 2 12a18.6 18.6 0 0 0 6.34 5.48M10.58 10.58a2.4 2.4 0 0 0 3.34 3.34"
      />
    </svg>
  );
}

function TextField({ label, value, onChange, multiline, maxLength }) {
  return (
    <label className="float-field">
      {multiline ? (
        <textarea value={value} maxLength={maxLength} onChange={onChange} placeholder=" " />
      ) : (
        <input value={value} maxLength={maxLength} onChange={onChange} placeholder=" " />
      )}
      <span>{label}</span>
    </label>
  );
}

function footerLinkError(footer) {
  const fields = [
    [footer.whatsappHref, "WhatsApp"],
    [footer.privacyHref, "aviso de privacidad"],
  ];
  for (const [value, label] of fields) {
    if (!isSafeHref(String(value ?? "").trim())) {
      return `El link del ${label} tiene que empezar con http, https, mailto, tel, / o #`;
    }
  }
  return "";
}

export function LandingEditor() {
  const { slug } = useParams();
  const [site, setSite] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [pendingDataUrl, setPendingDataUrl] = useState("");
  const [version, setVersion] = useState(0);
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [footer, setFooter] = useState(defaultFooter);
  const [section, setSection] = useState(null);
  const [drawerSection, setDrawerSection] = useState(null);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [viewport, setViewport] = useState("desktop");
  const [productsNote, setProductsNote] = useState("Cargando el listado de artículos…");
  const [catalog, setCatalog] = useState([]);
  const [selectedIds, setSelectedIds] = useState(null);
  const [libre, setLibre] = useState(() => libreFields());
  const [cotizar, setCotizar] = useState(() => cotizarFields());
  const [carousel, setCarousel] = useState(() => carouselFields());
  const [clients, setClients] = useState(() => defaultClients());
  const [sections, setSections] = useState(() => normalizeSections());
  const [saveState, setSaveState] = useState("idle");
  const [pagePhone, setPagePhone] = useState("");
  const draftRef = useRef(draft);
  const footerRef = useRef(footer);
  const pendingRef = useRef("");
  const savedKeyRef = useRef("");
  const savedFooterKeyRef = useRef(footerKey(footer));
  const selectedRef = useRef(null);
  const savedIdsRef = useRef(idsKey(null));
  const libreRef = useRef(libreFields());
  const savedLibreKeyRef = useRef(libreKey());
  const cotizarRef = useRef(cotizarFields());
  const savedCotizarKeyRef = useRef(cotizarKey());
  const carouselRef = useRef(carouselFields());
  const savedCarouselKeyRef = useRef(carouselKey());
  const clientsRef = useRef(clients);
  const savedClientsKeyRef = useRef(clientsKey(clients));
  const sectionsRef = useRef(normalizeSections());
  const savedSectionsKeyRef = useRef(sectionsKey(normalizeSections()));
  const catalogRef = useRef([]);
  const fieldsRef = useRef(null);
  const drawerTimerRef = useRef(0);
  const heroPaneRef = useRef(null);
  const diferencialPaneRef = useRef(null);
  const cotizarPaneRef = useRef(null);
  const formularioPaneRef = useRef(null);
  const destacadosPaneRef = useRef(null);
  const mapPaneRef = useRef(null);
  const faqPaneRef = useRef(null);
  const librePaneRef = useRef(null);
  const carouselPaneRef = useRef(null);
  const clientsPaneRef = useRef(null);
  const marcasPaneRef = useRef(null);
  const buscabasPaneRef = useRef(null);
  const footerPaneRef = useRef(null);
  const readyRef = useRef(false);
  const slugRef = useRef(slug);
  const timerRef = useRef(0);
  const tailRef = useRef(Promise.resolve());
  const generationRef = useRef(0);
  const aliveRef = useRef(true);
  const loadedSlugRef = useRef("");

  slugRef.current = slug;
  catalogRef.current = catalog;

  function isDirty() {
    return heroKey(draftRef.current) !== savedKeyRef.current
      || pendingRef.current !== ""
      || footerKey(footerRef.current) !== savedFooterKeyRef.current
      || idsKey(selectedRef.current) !== savedIdsRef.current
      || libreKey(libreRef.current) !== savedLibreKeyRef.current
      || cotizarKey(cotizarRef.current) !== savedCotizarKeyRef.current
      || carouselKey(carouselRef.current) !== savedCarouselKeyRef.current
      || clientsKey(clientsRef.current) !== savedClientsKeyRef.current
      || sectionsKey(sectionsRef.current) !== savedSectionsKeyRef.current;
  }

  async function saveCurrent(generation, slugAtEdit) {
    if (generationRef.current !== generation || !readyRef.current || !isDirty()) return;
    const hero = heroFields(draftRef.current);
    const footerSnapshot = footerFields(footerRef.current);
    const image = pendingRef.current;
    const heroDirty = heroKey(draftRef.current) !== savedKeyRef.current || image !== "";
    const footerDirty = footerKey(footerRef.current) !== savedFooterKeyRef.current;
    const idsSnapshot = selectedRef.current;
    const idsDirty = idsKey(idsSnapshot) !== savedIdsRef.current;
    const libreSnapshot = libreRef.current;
    const libreDirty = libreKey(libreSnapshot) !== savedLibreKeyRef.current;
    const cotizarSnapshot = cotizarRef.current;
    const cotizarDirty = cotizarKey(cotizarSnapshot) !== savedCotizarKeyRef.current;
    const carouselSnapshot = carouselRef.current;
    const carouselDirty = carouselKey(carouselSnapshot) !== savedCarouselKeyRef.current;
    const clientsSnapshot = clientsRef.current;
    const clientsDirty = clientsKey(clientsSnapshot) !== savedClientsKeyRef.current;
    const sectionsSnapshot = sectionsRef.current;
    const sectionsDirty = sectionsKey(sectionsSnapshot) !== savedSectionsKeyRef.current;
    if (heroDirty && !isSafeHref(hero.ctaHref.trim())) {
      throw new Error("El link tiene que empezar con http, https, mailto, tel, / o #");
    }
    const linkError = footerDirty ? footerLinkError(footerSnapshot) : "";
    if (linkError) throw new Error(linkError);
    if (aliveRef.current) {
      setSaveState("saving");
      setError("");
      setMessage("");
    }

    if (heroDirty || idsDirty || libreDirty || cotizarDirty || carouselDirty || clientsDirty || sectionsDirty) {
      const key = JSON.stringify(hero);
      const options = {};
      if (idsDirty) options.destacados = Array.isArray(idsSnapshot) ? idsSnapshot : [];
      if (libreDirty) options.libre = libreFields(libreSnapshot);
      if (cotizarDirty) options.cotizar = cotizarFields(cotizarSnapshot);
      if (carouselDirty) options.carousel = carouselFields(carouselSnapshot);
      if (clientsDirty) options.clients = clientsFields(clientsSnapshot);
      if (sectionsDirty) options.sections = sectionsSnapshot;
      const result = await saveLanding(slugAtEdit, hero, image, options);
      if (generationRef.current !== generation) return;
      if (heroDirty) {
        const textSame = heroKey(draftRef.current) === key;
        const imageSame = pendingRef.current === image;
        if (textSame) {
          const next = result.landing.hero;
          savedKeyRef.current = heroKey(next);
          if (imageSame) {
            pendingRef.current = "";
            draftRef.current = next;
          } else {
            draftRef.current = { ...next };
          }
        } else if (imageSame && image) {
          pendingRef.current = "";
          draftRef.current = {
            ...draftRef.current,
            backgroundImage: result.landing.hero.backgroundImage,
          };
        }
        if (!aliveRef.current || generationRef.current !== generation) return;
        setDraft(draftRef.current);
        if (imageSame) setPendingDataUrl("");
        if (image && (textSame || imageSame)) setVersion(Date.now());
      }
      if (idsDirty && idsKey(selectedRef.current) === idsKey(idsSnapshot)) {
        const returned = result.landing.destacados;
        const saved = Array.isArray(returned)
          ? returned
          : (Array.isArray(idsSnapshot) ? idsSnapshot : []);
        selectedRef.current = saved;
        savedIdsRef.current = idsKey(saved);
        if (aliveRef.current) {
          setSelectedIds(saved);
          setVersion(Date.now());
        }
      }
      if (libreDirty && libreKey(libreRef.current) === libreKey(libreSnapshot)) {
        const returned = libreFields(result.landing.libre);
        libreRef.current = returned;
        savedLibreKeyRef.current = libreKey(returned);
        if (aliveRef.current) setLibre(returned);
      }
      if (cotizarDirty && cotizarKey(cotizarRef.current) === cotizarKey(cotizarSnapshot)) {
        const returned = cotizarFields(result.landing.cotizar);
        cotizarRef.current = returned;
        savedCotizarKeyRef.current = cotizarKey(returned);
        if (aliveRef.current) setCotizar(returned);
      }
      if (carouselDirty && carouselKey(carouselRef.current) === carouselKey(carouselSnapshot)) {
        const returned = carouselFields(result.landing.carousel);
        carouselRef.current = returned;
        savedCarouselKeyRef.current = carouselKey(returned);
        if (aliveRef.current) {
          setCarousel(returned);
          setVersion(Date.now());
        }
      }
      if (clientsDirty && clientsKey(clientsRef.current) === clientsKey(clientsSnapshot)) {
        const returned = Array.isArray(result.landing.clients) ? result.landing.clients : [];
        clientsRef.current = returned;
        savedClientsKeyRef.current = clientsKey(returned);
        if (aliveRef.current) {
          setClients(returned);
          setVersion(Date.now());
        }
      }
      if (sectionsDirty && sectionsKey(sectionsRef.current) === sectionsKey(sectionsSnapshot)) {
        const returned = normalizeSections(result.landing.sections);
        sectionsRef.current = returned;
        savedSectionsKeyRef.current = sectionsKey(returned);
        if (aliveRef.current) setSections(returned);
      }
    }

    if (footerDirty && generationRef.current === generation) {
      const key = JSON.stringify(footerSnapshot);
      const result = await saveSiteFooter(footerSnapshot);
      if (generationRef.current !== generation) return;
      if (footerKey(footerRef.current) === key) {
        footerRef.current = result.footer;
        savedFooterKeyRef.current = footerKey(result.footer);
        if (aliveRef.current) setFooter(footerRef.current);
      }
    }

    if (!aliveRef.current || generationRef.current !== generation) return;
    if (!isDirty()) {
      setSaveState("saved");
      setMessage("Guardado");
    } else {
      setSaveState("idle");
    }
  }

  function enqueue(generation, slugAtEdit) {
    const run = tailRef.current.then(() => saveCurrent(generation, slugAtEdit));
    tailRef.current = run.then(() => {}, () => {});
    return run;
  }

  function showSaveError(err) {
    if (!aliveRef.current) return;
    setSaveState("error");
    setError(err.message);
    setMessage("");
  }

  function schedule(immediate) {
    window.clearTimeout(timerRef.current);
    const generation = generationRef.current;
    const slugAtEdit = slugRef.current;
    timerRef.current = window.setTimeout(() => {
      if (generationRef.current !== generation) return;
      enqueue(generation, slugAtEdit).catch(showSaveError);
    }, immediate ? 0 : SAVE_DELAY);
  }

  async function drain() {
    window.clearTimeout(timerRef.current);
    const generation = generationRef.current;
    const slugAtEdit = slugRef.current;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (generationRef.current !== generation || !isDirty()) return;
      await enqueue(generation, slugAtEdit);
    }
  }

  useEffect(() => {
    let active = true;
    readyRef.current = false;
    loadedSlugRef.current = "";
    setMissing(false);
    setMessage("");
    setError("");
    setSaveState("idle");
    window.clearTimeout(drawerTimerRef.current);
    setSection(null);
    setDrawerSection(null);
    setDrawerClosing(false);
    pendingRef.current = "";
    setPendingDataUrl("");
    tailRef.current.then(() => getSite())
      .then((data) => {
        if (!active) return;
        const landing = data.landings.find((item) => item.slug === slug);
        if (!landing) {
          setMissing(true);
          return;
        }
        const nextFooter = data.site.footer || defaultFooter();
        draftRef.current = landing.hero;
        savedKeyRef.current = heroKey(landing.hero);
        footerRef.current = nextFooter;
        savedFooterKeyRef.current = footerKey(nextFooter);
        pendingRef.current = "";
        const savedIds = Array.isArray(landing.destacados) ? landing.destacados : null;
        selectedRef.current = savedIds;
        savedIdsRef.current = idsKey(savedIds);
        const savedLibre = libreFields(landing.libre);
        libreRef.current = savedLibre;
        savedLibreKeyRef.current = libreKey(savedLibre);
        const savedCotizar = cotizarFields(landing.cotizar);
        cotizarRef.current = savedCotizar;
        savedCotizarKeyRef.current = cotizarKey(savedCotizar);
        const savedCarousel = carouselFields(landing.carousel);
        carouselRef.current = savedCarousel;
        savedCarouselKeyRef.current = carouselKey(savedCarousel);
        const savedClients = landingClients(landing, data.site);
        clientsRef.current = savedClients;
        savedClientsKeyRef.current = clientsKey(savedClients);
        const savedSections = normalizeSections(landing.sections);
        sectionsRef.current = savedSections;
        savedSectionsKeyRef.current = sectionsKey(savedSections);
        loadedSlugRef.current = slug;
        setSite(data.site);
        setPagePhone(landing.whatsapp || "");
        setDraft(landing.hero);
        setFooter(nextFooter);
        setSelectedIds(savedIds);
        setLibre(savedLibre);
        setCotizar(savedCotizar);
        setCarousel(savedCarousel);
        setClients(savedClients);
        setSections(savedSections);
        setPendingDataUrl("");
        setVersion(Date.now());
        readyRef.current = true;
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
      window.clearTimeout(drawerTimerRef.current);
    };
  }, [slug]);

  useEffect(() => {
    let active = true;
    getDestacados()
      .then((data) => {
        if (!active) return;
        const nextCatalog = Array.isArray(data.catalog) ? data.catalog : [];
        catalogRef.current = nextCatalog;
        setCatalog(nextCatalog);
        setProductsNote(nextCatalog.length ? "" : "No hay artículos en el listado.");
      })
      .catch((err) => {
        if (!active) return;
        catalogRef.current = [];
        setCatalog([]);
        setProductsNote(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      window.clearTimeout(timerRef.current);
      const slugAtExit = slug;
      const generation = generationRef.current;
      generationRef.current = generation + 1;
      if (!readyRef.current || !isDirty()) return;
      const hero = heroFields(draftRef.current);
      const footerSnapshot = footerFields(footerRef.current);
      const image = pendingRef.current;
      const heroDirty = heroKey(draftRef.current) !== savedKeyRef.current || image !== "";
      const footerDirty = footerKey(footerRef.current) !== savedFooterKeyRef.current;
      const idsSnapshot = selectedRef.current;
      const idsDirty = idsKey(idsSnapshot) !== savedIdsRef.current;
      const libreSnapshot = libreFields(libreRef.current);
      const libreDirty = libreKey(libreSnapshot) !== savedLibreKeyRef.current;
      const cotizarSnapshot = cotizarFields(cotizarRef.current);
      const cotizarDirty = cotizarKey(cotizarSnapshot) !== savedCotizarKeyRef.current;
      const carouselSnapshot = carouselFields(carouselRef.current);
      const carouselDirty = carouselKey(carouselSnapshot) !== savedCarouselKeyRef.current;
      const clientsSnapshot = clientsFields(clientsRef.current);
      const clientsDirty = clientsKey(clientsSnapshot) !== savedClientsKeyRef.current;
      const sectionsSnapshot = normalizeSections(sectionsRef.current);
      const sectionsDirty = sectionsKey(sectionsSnapshot) !== savedSectionsKeyRef.current;
      tailRef.current = tailRef.current.then(async () => {
        if (heroDirty && isSafeHref(hero.ctaHref.trim())) {
          await saveLanding(slugAtExit, hero, image, { keepalive: true }).catch(() => {});
        }
        if (idsDirty) {
          await saveLanding(slugAtExit, hero, "", {
            keepalive: true,
            destacados: Array.isArray(idsSnapshot) ? idsSnapshot : [],
          }).catch(() => {});
        }
        if (libreDirty) {
          await saveLanding(slugAtExit, hero, "", {
            keepalive: true,
            libre: libreSnapshot,
          }).catch(() => {});
        }
        if (cotizarDirty) {
          await saveLanding(slugAtExit, hero, "", {
            keepalive: true,
            cotizar: cotizarSnapshot,
          }).catch(() => {});
        }
        if (carouselDirty) {
          await saveLanding(slugAtExit, hero, "", {
            keepalive: true,
            carousel: carouselSnapshot,
          }).catch(() => {});
        }
        if (clientsDirty) {
          await saveLanding(slugAtExit, hero, "", {
            keepalive: true,
            clients: clientsSnapshot,
          }).catch(() => {});
        }
        if (sectionsDirty && isSafeHref(hero.ctaHref.trim())) {
          await saveLanding(slugAtExit, hero, "", {
            keepalive: true,
            sections: sectionsSnapshot,
          }).catch(() => {});
        }
        if (footerDirty && !footerLinkError(footerSnapshot)) {
          await saveSiteFooter(footerSnapshot, { keepalive: true }).catch(() => {});
        }
      });
    };
  }, [slug]);

  function update(field, value) {
    if (loadedSlugRef.current !== slug) return;
    const next = { ...draftRef.current, [field]: value };
    draftRef.current = next;
    setDraft(next);
    setError("");
    schedule(false);
  }

  function updateFooter(field, value) {
    if (loadedSlugRef.current !== slug) return;
    const next = { ...footerRef.current, [field]: value };
    footerRef.current = next;
    setFooter(next);
    setError("");
    schedule(false);
  }

  function commitIds(next) {
    if (loadedSlugRef.current !== slug) return;
    selectedRef.current = next;
    setSelectedIds(next);
    setError("");
    schedule(false);
  }

  function commitClients(next, immediate = false) {
    if (loadedSlugRef.current !== slug) return;
    clientsRef.current = next;
    setClients(next);
    setError("");
    schedule(immediate);
  }

  function rejectClients(message) {
    if (!aliveRef.current) return;
    setSaveState("error");
    setError(message);
    setMessage("");
  }

  function updateLibre(field, value) {
    if (loadedSlugRef.current !== slug) return;
    const next = { ...libreRef.current, [field]: value };
    libreRef.current = next;
    setLibre(next);
    setError("");
    schedule(false);
  }

  function updateCotizar(field, value) {
    if (loadedSlugRef.current !== slug) return;
    const next = { ...cotizarRef.current, [field]: value };
    cotizarRef.current = next;
    setCotizar(next);
    setError("");
    schedule(false);
  }

  function updateCotizarStep(index, field, value) {
    if (loadedSlugRef.current !== slug) return;
    const steps = cotizarRef.current.steps.map((step, stepIndex) => (
      stepIndex === index ? { ...step, [field]: value } : step
    ));
    const next = { ...cotizarRef.current, steps };
    cotizarRef.current = next;
    setCotizar(next);
    setError("");
    schedule(false);
  }

  function updateCarousel(field, value) {
    if (loadedSlugRef.current !== slug) return;
    const next = { ...carouselRef.current, [field]: value };
    carouselRef.current = next;
    setCarousel(next);
    setError("");
    schedule(false);
  }

  function commitSlides(slides, immediate = false) {
    if (loadedSlugRef.current !== slug) return;
    const next = { ...carouselRef.current, slides };
    carouselRef.current = next;
    setCarousel(next);
    setError("");
    schedule(immediate);
  }

  function rejectCarousel(message) {
    if (!aliveRef.current) return;
    setSaveState("error");
    setError(message);
    setMessage("");
  }

  function toggleSection(id) {
    if (loadedSlugRef.current !== slug) return;
    const next = {
      ...sectionsRef.current,
      [id]: sectionsRef.current[id] === false,
    };
    sectionsRef.current = next;
    setSections(next);
    setError("");
    schedule(false);
  }

  function reorderSection(id, delta) {
    if (loadedSlugRef.current !== slug) return;
    const next = moveSection(sectionsRef.current, id, delta);
    if (sectionsKey(next) === sectionsKey(sectionsRef.current)) return;
    sectionsRef.current = next;
    setSections(next);
    setError("");
    schedule(false);
  }

  function entryId(item) {
    return typeof item === "string" ? item : item?.id;
  }

  function addProduct(id) {
    const ids = Array.isArray(selectedRef.current) ? selectedRef.current : [];
    if (ids.some((item) => entryId(item) === id) || ids.length >= DESTACADOS_COUNT) return;
    commitIds(ids.concat(id));
  }

  function addCustom(product) {
    const ids = Array.isArray(selectedRef.current) ? selectedRef.current : [];
    if (ids.length >= DESTACADOS_COUNT) return;
    const id = `c-${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
    commitIds(ids.concat({
      source: "custom",
      id,
      title: product.title,
      brand: product.brand,
      imageDataUrl: product.imageDataUrl,
    }));
  }

  function removeProduct(id) {
    const ids = Array.isArray(selectedRef.current) ? selectedRef.current : [];
    commitIds(ids.filter((item) => entryId(item) !== id));
  }

  function openSection(next) {
    window.clearTimeout(drawerTimerRef.current);
    if (section === next) {
      setSection(null);
      setDrawerClosing(true);
      const wait = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DRAWER_MS;
      drawerTimerRef.current = window.setTimeout(() => {
        setDrawerSection(null);
        setDrawerClosing(false);
      }, wait);
      return;
    }
    setDrawerClosing(false);
    setSection(next);
    setDrawerSection(next);
    if (fieldsRef.current) fieldsRef.current.scrollTop = 0;
    const panes = {
      hero: heroPaneRef,
      diferencial: diferencialPaneRef,
      cotizar: cotizarPaneRef,
      formulario: formularioPaneRef,
      destacados: destacadosPaneRef,
      map: mapPaneRef,
      faq: faqPaneRef,
      libre: librePaneRef,
      carousel: carouselPaneRef,
      clients: clientsPaneRef,
      marcas: marcasPaneRef,
      buscabas: buscabasPaneRef,
      footer: footerPaneRef,
    };
    const node = panes[next]?.current;
    window.requestAnimationFrame(() => {
      const view = node?.ownerDocument?.defaultView;
      if (!node || !view) return;
      const top = node.getBoundingClientRect().top + view.scrollY;
      view.scrollTo({ top, behavior: "smooth" });
    });
  }

  async function onImage(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const generation = generationRef.current;
    setError("");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("La imagen tiene que ser JPG, PNG o WebP");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("La imagen supera 8 MB");
      return;
    }
    try {
      const dataUrl = await readImage(file);
      if (generationRef.current !== generation) return;
      pendingRef.current = dataUrl;
      setPendingDataUrl(dataUrl);
      schedule(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSave(event) {
    event.preventDefault();
    setError("");
    try {
      await drain();
      if (aliveRef.current && !isDirty()) {
        setSaveState("saved");
        setMessage("Guardado");
      }
    } catch (err) {
      showSaveError(err);
    }
  }

  const imageUrl = pendingDataUrl || mediaUrl(draft.backgroundImage, version);
  const hasSelection = Array.isArray(selectedIds);
  const pickedProducts = hasSelection
    ? resolveDestacados(catalog, selectedIds).map((card) => {
        if (card.source !== "custom" || card.imageUrl || !card.image) return card;
        return { ...card, imageUrl: mediaUrl(card.image, version) };
      })
    : [];
  const shownProducts = pickedProducts;
  const statusText = error
    ? error
    : saveState === "saving"
      ? "Guardando…"
      : (message || "Los cambios se guardan solos.");
  const statusClass = error
    ? "status status--error"
    : saveState === "saving"
      ? "status status--saving"
      : message
        ? "status status--ok"
        : "status";

  const previewHero = pagePhone
    ? { ...draft, ctaHref: withWhatsappPhone(draft.ctaHref, pagePhone) }
    : draft;
  const previewFooter = pagePhone
    ? { ...footer, whatsappHref: withWhatsappPhone(footer.whatsappHref, pagePhone) }
    : footer;

  function previewBlock(id) {
    if (!sectionVisible(sections, id)) return null;
    if (id === "hero") {
      return (
        <div key={id} ref={heroPaneRef}>
          <Hero
            site={site}
            hero={previewHero}
            imageUrl={imageUrl}
            faqHref={`/landings/${slug}/preguntas`}
            faqTarget="_top"
          />
        </div>
      );
    }
    if (id === "marcas") {
      return (
        <div key={id} ref={marcasPaneRef}>
          <Marcas />
        </div>
      );
    }
    if (id === "diferencial") {
      return (
        <div key={id} ref={diferencialPaneRef}>
          <Diferencial ctaLabel={previewHero.ctaLabel} ctaHref={previewHero.ctaHref} />
        </div>
      );
    }
    if (id === "cotizar") {
      return (
        <div key={id} ref={cotizarPaneRef}>
          <ComoCotizar cotizar={cotizar} />
        </div>
      );
    }
    if (id === "destacados") {
      return (
        <div key={id} ref={destacadosPaneRef}>
          <Destacados products={shownProducts} />
        </div>
      );
    }
    if (id === "carousel") {
      return (
        <div key={id} ref={carouselPaneRef}>
          <Carousel
            live
            showEmpty
            carousel={{
              ...carousel,
              slides: carousel.slides.map((slide) => ({
                ...slide,
                src: slide.imageDataUrl || (slide.image ? mediaUrl(slide.image, version) : ""),
              })),
            }}
          />
        </div>
      );
    }
    if (id === "libre") {
      return (
        <div key={id} ref={librePaneRef}>
          <Libre libre={libre} showEmpty />
        </div>
      );
    }
    if (id === "clients") {
      return (
        <div key={id} ref={clientsPaneRef}>
          <Clients logos={clients.map((logo) => ({
            id: logo.id,
            alt: logo.alt,
            file: logo.file,
            src: logo.imageDataUrl || (String(logo.file || "").startsWith("images/") ? mediaUrl(logo.file, version) : ""),
          }))} />
        </div>
      );
    }
    if (id === "formulario") {
      return (
        <div key={id} ref={formularioPaneRef}>
          <Formulario source={slug} />
        </div>
      );
    }
    if (id === "map") {
      return (
        <div key={id} ref={mapPaneRef}>
          <LocationMap address={footer.address} />
        </div>
      );
    }
    if (id === "faq") {
      return (
        <div key={id} ref={faqPaneRef}>
          <FaqLink href={`/landings/${slug}/preguntas`} target="_top" />
        </div>
      );
    }
    if (id === "buscabas") {
      return (
        <div key={id} ref={buscabasPaneRef}>
          <Buscabas />
        </div>
      );
    }
    if (id === "footer") {
      return (
        <div key={id} ref={footerPaneRef}>
          <Footer site={site} footer={footer} />
        </div>
      );
    }
    return null;
  }

  if (missing || !site || loadedSlugRef.current !== slug) {
    return (
      <main className="page">
        <p className="lede">
          {missing
            ? <>No existe esa landing. <Link to="/landings">Volver al listado</Link></>
            : (loadedSlugRef.current !== slug ? "Cargando…" : (error || "Cargando…"))}
        </p>
      </main>
    );
  }

  return (
    <main className="editor">
      <nav className="component-nav" aria-label="Componentes">
        {sectionOrder(sections).map((id, index, order) => {
          const item = SECTION_NAV.find((entry) => entry.id === id);
          if (!item) return null;
          const visible = sectionVisible(sections, item.id);
          return (
            <div
              className={visible ? "component-nav__row" : "component-nav__row component-nav__row--off"}
              key={item.id}
            >
              <div className="component-nav__move">
                <button
                  type="button"
                  className="component-nav__move-btn"
                  aria-label={`Subir ${item.label}`}
                  title="Subir"
                  disabled={index === 0}
                  onClick={() => reorderSection(item.id, -1)}
                >
                  <MoveIcon direction="up" />
                </button>
                <button
                  type="button"
                  className="component-nav__move-btn"
                  aria-label={`Bajar ${item.label}`}
                  title="Bajar"
                  disabled={index === order.length - 1}
                  onClick={() => reorderSection(item.id, 1)}
                >
                  <MoveIcon direction="down" />
                </button>
              </div>
              <button
                type="button"
                className="component-nav__item"
                aria-pressed={section === item.id}
                onClick={() => openSection(item.id)}
              >
                <span>{item.label}</span>
              </button>
              <button
                type="button"
                className="component-nav__eye"
                aria-pressed={visible}
                aria-label={visible ? `Ocultar ${item.label}` : `Mostrar ${item.label}`}
                title={visible ? "Ocultar sección" : "Mostrar sección"}
                onClick={() => toggleSection(item.id)}
              >
                <EyeIcon open={visible} />
              </button>
            </div>
          );
        })}
      </nav>
      <div className={section ? "editor__workspace editor__workspace--open" : "editor__workspace"}>
      <div className="editor__panel" aria-hidden={drawerSection ? undefined : true}>
      {drawerSection ? (
      <form className={drawerClosing ? "fields fields--out" : "fields"} key={drawerSection} onSubmit={onSave} ref={fieldsRef}>
        <p className="hint">
          HTML exportado: <a href={`/export/${slug}/`} target="_blank" rel="noreferrer">/{slug}/</a>
        </p>
        {drawerSection === "hero" ? <p className="hint">El número de WhatsApp se define en Páginas. En el link podés cambiar el mensaje.</p> : null}
        {drawerSection === "footer" ? <p className="hint">Este pie es el mismo en todas las landings. El número de WhatsApp de cada página se define en Páginas; este enlace aporta el mensaje del botón flotante.</p> : null}
        {drawerSection === "map" ? <p className="hint">El mapa usa la dirección del pie y es el mismo en todas las landings.</p> : null}
        {drawerSection === "faq" ? (
          <p className="hint">
            Estas preguntas están en una página aparte de esta landing. Se abren desde el menú o desde el botón Preguntas frecuentes.{" "}
            <Link to={`/landings/${slug}/preguntas`}>Editar la página</Link>
          </p>
        ) : null}
        {drawerSection === "libre" ? <p className="hint">Este espacio es solo de esta landing. El título y el texto no se comparten con las otras.</p> : null}
        {drawerSection === "carousel" ? <p className="hint">Este carrusel es solo de esta landing. La etiqueta, el título, el subtítulo y las imágenes no se comparten. El texto de cada imagen aparece sobre la foto y el link es la flecha.</p> : null}
        {drawerSection === "clients" ? <p className="hint">Estos iconos son solo de esta landing. Podés agregar, ordenar, cambiar o sacar iconos.</p> : null}
        {drawerSection === "marcas" ? <p className="hint">Estos logos son las marcas que trabajamos. Son los mismos en todas las landings.</p> : null}
        {drawerSection === "diferencial" ? <p className="hint">Estos cuatro bloques son los mismos en todas las landings.</p> : null}
        {drawerSection === "cotizar" ? <p className="hint">Estos textos son solo de esta landing.</p> : null}
        {drawerSection === "formulario" ? <p className="hint">Este formulario es el mismo en todas las landings. El mail llega a renovafiltros@gmail.com e indica de qué landing salió. Los archivos no pueden pasar de 10 MB en total.</p> : null}
        {drawerSection === "buscabas" ? <p className="hint">Este bloque es el mismo en todas las landings. Sirve si alguien llegó a una página muy específica y busca el catálogo general. El botón abre el inicio de Renova.</p> : null}
        {drawerSection === "destacados" ? <p className="hint">Los destacados de esta landing no se comparten con las otras.</p> : null}
        <p className={statusClass} role="status" aria-live="polite">
          {saveState === "saving" && !error ? <Spinner /> : null}
          {statusText}
        </p>
        {sections[drawerSection] === false ? <p className="hint">Esta sección está oculta. El ojo la vuelve a mostrar.</p> : null}
        {drawerSection === "hero" ? (
          <>
            <label className="float-field float-field--file">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onImage} />
              <span>Imagen de fondo</span>
            </label>
            {imageUrl ? <img className="thumb" src={imageUrl} alt="" /> : <p className="hint">Todavía no hay imagen.</p>}
            <TextField label="Antetítulo" value={draft.eyebrow} onChange={(event) => update("eyebrow", event.target.value)} />
            <TextField label="Título" value={draft.heading} onChange={(event) => update("heading", event.target.value)} />
            <TextField label="Bajada" value={draft.subhead} onChange={(event) => update("subhead", event.target.value)} multiline />
            <TextField label="Texto del botón" value={draft.ctaLabel} onChange={(event) => update("ctaLabel", event.target.value)} />
            <TextField label="Link del botón" value={draft.ctaHref} onChange={(event) => update("ctaHref", event.target.value)} />
          </>
        ) : drawerSection === "destacados" ? (
          <ProductPicker
            catalog={catalog}
            selected={pickedProducts}
            onAdd={addProduct}
            onAddCustom={addCustom}
            onRemove={removeProduct}
            note={productsNote}
          />
        ) : drawerSection === "cotizar" ? (
          <>
            <TextField label="Título" value={cotizar.heading} maxLength={80} onChange={(event) => updateCotizar("heading", event.target.value)} />
            <TextField label="Bajada" value={cotizar.lead} maxLength={240} onChange={(event) => updateCotizar("lead", event.target.value)} multiline />
            {cotizar.steps.map((step, index) => (
              <div key={index}>
                <p className="hint">Paso {index + 1}</p>
                <TextField label="Título" value={step.title} maxLength={120} onChange={(event) => updateCotizarStep(index, "title", event.target.value)} />
                <TextField label="Texto" value={step.text} maxLength={280} onChange={(event) => updateCotizarStep(index, "text", event.target.value)} multiline />
              </div>
            ))}
          </>
        ) : drawerSection === "faq" ? null : drawerSection === "libre" ? (
          <>
            <TextField label="Título" value={libre.heading} onChange={(event) => updateLibre("heading", event.target.value)} />
            <TextField label="Texto" value={libre.text} onChange={(event) => updateLibre("text", event.target.value)} multiline />
          </>
        ) : drawerSection === "carousel" ? (
          <>
            <TextField label="Etiqueta" value={carousel.eyebrow} maxLength={40} onChange={(event) => updateCarousel("eyebrow", event.target.value)} />
            <TextField label="Título" value={carousel.line1} maxLength={48} onChange={(event) => updateCarousel("line1", event.target.value)} />
            <TextField label="Subtítulo" value={carousel.line1Muted} maxLength={80} onChange={(event) => updateCarousel("line1Muted", event.target.value)} />
            <CarouselEditor slides={carousel.slides} version={version} onChange={commitSlides} onError={rejectCarousel} />
          </>
        ) : drawerSection === "clients" ? (
          <ClientsEditor logos={clients} version={version} onChange={commitClients} onError={rejectClients} />
        ) : drawerSection === "map" || drawerSection === "marcas" || drawerSection === "diferencial" || drawerSection === "formulario" || drawerSection === "buscabas" ? null : (
          <>
            <TextField label="Razón social" value={footer.legalName} onChange={(event) => updateFooter("legalName", event.target.value)} />
            <TextField label="CUIT" value={footer.taxId} onChange={(event) => updateFooter("taxId", event.target.value)} />
            <TextField label="Dirección" value={footer.address} onChange={(event) => updateFooter("address", event.target.value)} />
            <TextField label="Texto del aviso" value={footer.privacyLabel} onChange={(event) => updateFooter("privacyLabel", event.target.value)} />
            <TextField label="Link del aviso" value={footer.privacyHref} onChange={(event) => updateFooter("privacyHref", event.target.value)} />
            <TextField label="Aviso de privacidad" value={footer.privacyText} onChange={(event) => updateFooter("privacyText", event.target.value)} multiline />
            <TextField label="Copyright" value={footer.copyright} onChange={(event) => updateFooter("copyright", event.target.value)} />
            <TextField label="Link de WhatsApp" value={footer.whatsappHref} onChange={(event) => updateFooter("whatsappHref", event.target.value)} />
          </>
        )}
      </form>
      ) : null}
      </div>
      <section className={`preview preview--${viewport}`}>
        <div className="preview__modes" role="group" aria-label="Tamaño de la vista previa">
          <button
            type="button"
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
          >
            Escritorio
          </button>
          <button
            type="button"
            aria-pressed={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
          >
            Celular
          </button>
        </div>
        <DevicePreview viewport={viewport} site={site}>
          {sectionOrder(sections).flatMap((id, index, order) => {
            const beforeFooter = id === "buscabas" && order[index + 1] === "footer";
            if (beforeFooter) return [];
            const block = previewBlock(id);
            if (id !== "footer") return block ? [block] : [];
            const buscabas = order[index - 1] === "buscabas" ? previewBlock("buscabas") : null;
            return [
              ...(buscabas ? [buscabas] : []),
              ...(block ? [block] : []),
            ];
          })}
          <WhatsAppFloat footer={previewFooter} />
        </DevicePreview>
      </section>
      </div>
    </main>
  );
}
