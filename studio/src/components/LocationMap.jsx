import { SectionTitle } from "./SectionTitle.jsx";

const FALLBACK_ADDRESS = "Dr. Adolfo Dickman 984, La Paternal, CABA, Argentina";

export function LocationMap({ address }) {
  const place = String(address ?? "").trim() || FALLBACK_ADDRESS;
  const query = encodeURIComponent(place);
  const src = `https://maps.google.com/maps?q=${query}&z=16&hl=es&output=embed`;
  const href = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <section className="site-map" aria-labelledby="site-map-title">
      <div className="site-map__copy">
        <SectionTitle id="site-map-title" title="Dónde estamos" tone="dark" />
        <p>{place}</p>
        <a href={href} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
      </div>
      <div className="site-map__canvas">
        <iframe
          title={`Mapa de ${place}`}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </section>
  );
}
