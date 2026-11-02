const LOGOS = [
  { file: "color-petronas.png", alt: "Petronas" },
  { file: "color-puma.png", alt: "Puma Lubricants" },
  { file: "color-valvoline.png", alt: "Valvoline" },
  { file: "color-wagner.png", alt: "Wagner Brake Products" },
  { file: "color-mann.png", alt: "MANN FILTER" },
  { file: "color-fram.png", alt: "FRAM" },
  { file: "color-total.png", alt: "TotalEnergies" },
  { file: "color-castrol.png", alt: "Castrol" },
  { file: "color-gulf.png", alt: "Gulf" },
  { file: "color-motul.png", alt: "Motul" },
];

export function Marcas({ logoBase = "/brands" }) {
  const base = String(logoBase || "/brands").replace(/\/$/, "");

  return (
    <section className="site-brands" aria-label="Marcas que trabajamos">
      <ul className="site-brands__logos">
        {LOGOS.map((logo) => (
          <li key={logo.file}>
            <img src={`${base}/${logo.file}`} alt={logo.alt} />
          </li>
        ))}
      </ul>
    </section>
  );
}
