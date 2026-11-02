export function SectionTitle({ id, eyebrow, title, subtitle, tone = "light" }) {
  const label = String(eyebrow ?? "").trim();
  const strong = String(title ?? "").trim();
  const sub = String(subtitle ?? "").trim();
  if (!label && !strong && !sub) return null;
  const classes = [
    "section-title",
    tone === "dark" ? "section-title--on-dark" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {label ? <p className="section-title__eyebrow">{label}</p> : null}
      {strong ? <h2 id={id}>{strong}</h2> : null}
      {sub ? <p className="section-title__sub" id={strong ? undefined : id}>{sub}</p> : null}
    </div>
  );
}
