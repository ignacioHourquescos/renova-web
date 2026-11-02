import { defaultCotizar } from "../../shared/content.js";
import { SectionTitle } from "./SectionTitle.jsx";

function stepCopy(step, fallback) {
  const source = step && typeof step === "object" ? step : {};
  return {
    title: source.title == null ? fallback.title : String(source.title),
    text: source.text == null ? fallback.text : String(source.text),
  };
}

export function cotizarCopy(cotizar) {
  const fallback = defaultCotizar();
  const source = cotizar && typeof cotizar === "object" && !Array.isArray(cotizar) ? cotizar : {};
  const stepsIn = Array.isArray(source.steps) ? source.steps : [];
  return {
    heading: source.heading == null ? fallback.heading : String(source.heading),
    lead: source.lead == null ? fallback.lead : String(source.lead),
    steps: fallback.steps.map((step, index) => stepCopy(stepsIn[index], step)),
  };
}

export function ComoCotizar({ cotizar }) {
  const copy = cotizarCopy(cotizar);
  return (
    <section className="cotizar" aria-labelledby={copy.heading.trim() ? "cotizar-title" : undefined}>
      <div className="cotizar__inner">
        <SectionTitle id="cotizar-title" title={copy.heading} />
        {copy.lead ? <p className="cotizar__lead">{copy.lead}</p> : null}
        <ol className="cotizar__steps">
          {copy.steps.map((step, index) => (
            <li className="cotizar__step" key={index}>
              <span className="cotizar__num">{index + 1}</span>
              {step.title ? <h3>{step.title}</h3> : null}
              {step.text ? <p>{step.text}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
