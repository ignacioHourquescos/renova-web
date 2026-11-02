import { SectionTitle } from "./SectionTitle.jsx";

export function Destacados({ products = [] }) {
  return (
    <section className="destacados" aria-labelledby="destacados-title">
      <SectionTitle id="destacados-title" title="Destacados" />
      {products.length ? (
        <ul className="destacados__grid">
          {products.map((product) => (
            <li className="destacados__card" key={product.id}>
              <div className="destacados__fit">
                <div className="destacados__media">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.title} loading="lazy" decoding="async" />
                  ) : (
                    <span className="destacados__placeholder">{product.brand || "Renova"}</span>
                  )}
                  {product.badge ? <span className="destacados__badge">{product.badge}</span> : null}
                </div>
                <div className="destacados__info">
                  {product.brand ? <p className="destacados__brand">{product.brand}</p> : null}
                  <p className="destacados__name">{product.title}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="destacados__empty">Todavía no hay productos destacados.</p>
      )}
    </section>
  );
}
