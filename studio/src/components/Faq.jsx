import { FAQ_HREF, HOME_HREF } from "./Hero.jsx";

export function visibleFaq(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      question: String(item?.question ?? "").trim(),
      answer: String(item?.answer ?? "").trim(),
    }))
    .filter((item) => item.question && item.answer);
}

function FaqList({ items, showEmpty = false }) {
  const list = visibleFaq(items);
  if (!list.length && !showEmpty) return null;
  if (!list.length) {
    return <p className="faq__empty">Las preguntas de esta landing van a aparecer acá.</p>;
  }
  return (
    <div className="faq__list">
      {list.map((item, index) => (
        <details className="faq__item" key={`${item.question}-${index}`}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function FaqLink({ href = FAQ_HREF, target }) {
  const link = { href };
  if (target) link.target = target;
  return (
    <section className="faq-link">
      <a className="hero__cta" {...link}>Preguntas frecuentes</a>
    </section>
  );
}

export function FaqPageView({ items = [], logoSrc = "/logo-renova.png", showEmpty = false }) {
  return (
    <main className="faq-page">
      <header className="faq-page__bar">
        <a href={HOME_HREF} target="_blank" rel="noopener noreferrer">
          <img src={logoSrc} alt="Renova" />
        </a>
      </header>
      <div className="faq-page__wrap">
        <h1>Preguntas frecuentes</h1>
        <FaqList items={items} showEmpty={showEmpty} />
      </div>
    </main>
  );
}
