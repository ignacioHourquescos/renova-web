import { defaultClients } from "../../shared/content.js";
import { SectionTitle } from "./SectionTitle.jsx";

function logoSrc(logo, base) {
  if (logo.src) return logo.src;
  const file = String(logo.file || "");
  if (!file || file.includes("/")) return "";
  return `${base}/${file}`;
}

export function Clients({ logos, logoBase = "/clients" }) {
  const base = String(logoBase || "/clients").replace(/\/$/, "");
  const items = Array.isArray(logos) ? logos : defaultClients();

  return (
    <section className="site-clients" aria-labelledby="site-clients-title">
      <SectionTitle id="site-clients-title" title="Confían en nosotros" tone="dark" />
      <ul className="site-clients__logos">
        {items.map((logo) => {
          const src = logoSrc(logo, base);
          if (!src) return null;
          const key = logo.id || logo.file || src;
          return (
            <li key={key}>
              <img src={src} alt={logo.alt || ""} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
