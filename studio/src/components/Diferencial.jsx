import { PageCta } from "./Hero.jsx";
import { SectionTitle } from "./SectionTitle.jsx";

const ITEMS = [
  {
    title: "Precio mayorista",
    text: "Comprás al valor de distribuidor, directo y sin recargos de reventa.",
    icon: "tag",
  },
  {
    title: "Stock permanente",
    text: "Filtros y lubricantes listos para salir cuando los pedís.",
    icon: "stock",
  },
  {
    title: "Entrega en todo el país",
    text: "Llegamos a tu depósito, taller o campo, estés donde estés.",
    icon: "truck",
  },
  {
    title: "Sin monto mínimo",
    text: "Pedís lo que necesitás. No hay un volumen obligatorio.",
    icon: "check",
  },
];

function Icon({ name }) {
  return (
    <span className="diferencial__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {name === "tag" ? (
          <>
            <path d="M12.2 3.5H5.2A1.7 1.7 0 0 0 3.5 5.2v7l8.6 8.6a1.7 1.7 0 0 0 2.4 0l6.3-6.3a1.7 1.7 0 0 0 0-2.4l-8.6-8.6z" />
            <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
          </>
        ) : null}
        {name === "stock" ? (
          <>
            <path d="M3.5 8 12 4l8.5 4L12 12 3.5 8z" />
            <path d="M3.5 8v8L12 20l8.5-4V8" />
            <path d="M12 12v8" />
          </>
        ) : null}
        {name === "truck" ? (
          <>
            <path d="M3 7.5h10.5V17H3z" />
            <path d="M13.5 10.5H18l2.5 3V17h-7" />
            <circle cx="7" cy="17.5" r="1.4" />
            <circle cx="17" cy="17.5" r="1.4" />
          </>
        ) : null}
        {name === "check" ? (
          <>
            <circle cx="12" cy="12" r="8" />
            <path d="M8.4 12.2 10.8 14.6 15.7 9.5" />
          </>
        ) : null}
      </svg>
    </span>
  );
}

export function Diferencial({ ctaLabel, ctaHref }) {
  return (
    <section className="diferencial" aria-labelledby="diferencial-title">
      <div className="diferencial__inner">
        <SectionTitle id="diferencial-title" title="Por qué trabajan con nosotros" />
        <ul className="diferencial__grid">
          {ITEMS.map((item) => (
            <li className="diferencial__card" key={item.title}>
              <Icon name={item.icon} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
        <PageCta label={ctaLabel} href={ctaHref} tone="inline" />
      </div>
    </section>
  );
}
