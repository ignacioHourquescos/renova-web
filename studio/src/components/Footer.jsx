import { isSafeHref } from "../../shared/content.js";

function linkProps(href) {
  const value = String(href ?? "").trim();
  if (!value || !isSafeHref(value)) return null;
  if (/^https?:/i.test(value)) {
    return { href: value, target: "_blank", rel: "noopener noreferrer" };
  }
  return { href: value };
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.04 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.26.6 4.44 1.72 6.36L3.2 28.8l6.6-1.73a12.75 12.75 0 0 0 6.24 1.6h.01c7.07 0 12.8-5.73 12.8-12.8s-5.73-12.67-12.81-12.67zm0 23.42h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.02 1.06 1.07-3.9-.25-.4a10.6 10.6 0 0 1-1.63-5.67c0-5.86 4.77-10.62 10.64-10.62 2.84 0 5.51 1.11 7.52 3.12a10.55 10.55 0 0 1 3.11 7.51c0 5.86-4.77 10.61-10.64 10.61zm5.83-7.95c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.51-.16-.72.16-.21.32-.83 1.04-1.02 1.25-.19.21-.38.24-.7.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.87-1.76-2.19-.19-.32-.02-.49.14-.65.14-.14.32-.38.48-.56.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.53-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.67 0 1.57 1.15 3.08 1.31 3.3.16.21 2.26 3.45 5.47 4.84.76.33 1.36.53 1.82.67.77.24 1.46.21 2.02.13.62-.09 1.89-.77 2.16-1.51.27-.75.27-1.38.19-1.51-.08-.14-.29-.21-.61-.37z"
      />
    </svg>
  );
}

export function WhatsAppFloat({ footer }) {
  const whatsapp = linkProps(footer?.whatsappHref);
  if (!whatsapp) return null;

  return (
    <a className="wa-float" {...whatsapp} aria-label="Escribir por WhatsApp">
      <WhatsAppIcon />
    </a>
  );
}

const AFIP_QR_HREF = "https://www.cuitonline.com/detalle/20934613008/grosso-fiore.html";

export function Footer({ site, footer, qrSrc = "/qrafip.jpg" }) {
  const privacy = linkProps(footer.privacyHref);
  const legal = [footer.legalName, footer.taxId ? `CUIT ${footer.taxId}` : ""].filter(Boolean).join(" · ");
  const privacyText = String(footer.privacyText ?? "").trim();
  const showPrivacy = privacyText && String(footer.privacyHref ?? "").trim() === "#privacidad";

  return (
      <footer className="site-footer">
        {site.brand ? <p className="site-footer__brand">{site.brand}</p> : null}
        <p className="site-footer__qr">
          <a href={AFIP_QR_HREF} target="_blank" rel="noopener noreferrer">
            <img src={qrSrc} alt="Código QR AFIP" />
          </a>
        </p>
        {legal ? <p>{legal}</p> : null}
        {footer.address ? <p>{footer.address}</p> : null}
        {footer.privacyLabel ? (
          <p>
            {privacy ? <a {...privacy}>{footer.privacyLabel}</a> : footer.privacyLabel}
          </p>
        ) : null}
        {footer.copyright ? <p className="site-footer__legal">{footer.copyright}</p> : null}
        {showPrivacy ? (
          <aside className="site-footer__privacy" id="privacidad">
            <h3>Aviso de privacidad</h3>
            <p>{privacyText}</p>
          </aside>
        ) : null}
      </footer>
  );
}
