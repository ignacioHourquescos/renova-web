import { parseCards } from "../../shared/content.js";
import { SectionTitle } from "./SectionTitle.jsx";

function libreCopy(libre) {
  return {
    heading: String(libre?.heading ?? "").trim(),
    text: String(libre?.text ?? "").trim(),
    cards: parseCards(libre?.cards).filter((card) => card.title),
  };
}

export function Libre({ libre = {}, showEmpty = false }) {
  const { heading, text, cards } = libreCopy(libre);
  if (!heading && !text && !cards.length && !showEmpty) return null;

  return (
    <section className="libre" aria-labelledby={heading ? "libre-title" : undefined}>
      <div className="libre__inner">
        {heading ? <SectionTitle id="libre-title" title={heading} /> : null}
        {text ? <p className="libre__text">{text}</p> : null}
        {cards.length ? (
          <ul className="libre__cards">
            {cards.map((card, index) => (
              <li className="libre__card" key={`${index}-${card.title}`}>
                <h3>{card.title}</h3>
                {card.text ? <p>{card.text}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {!heading && !text && !cards.length ? (
          <p className="libre__empty">El espacio libre de esta landing va a aparecer acá.</p>
        ) : null}
      </div>
    </section>
  );
}
