export const DEFAULT_WHATSAPP = "5491140565047";
export const GA_MEASUREMENT_ID = "G-XBLCSSZSLT";
export const CONSULTA_CONVERSION = "AW-963730457/IHweCOa9gPQCEJm4xcsD";
export const ALTA_CONVERSION = "AW-963730457/zkajCPemyvMCEJm4xcsD";

const ADS_CONVERSION = /^AW-\d+\/[A-Za-z0-9_-]{1,40}$/;

export function whatsappDigits(href) {
  const value = String(href ?? "").trim();
  if (!value) return "";
  let url;
  try {
    url = new URL(value);
  } catch {
    return "";
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "wa.me") return url.pathname.replace(/\D/g, "");
  if (host === "api.whatsapp.com" || host === "web.whatsapp.com") {
    return (url.searchParams.get("phone") || "").replace(/\D/g, "");
  }
  return "";
}

export function formatPhone(digits) {
  const value = String(digits ?? "").replace(/\D/g, "");
  const buenosAires = /^549(11)(\d{4})(\d{4})$/.exec(value);
  if (buenosAires) return `+54 9 ${buenosAires[1]} ${buenosAires[2]}-${buenosAires[3]}`;
  return value ? `+${value}` : "";
}

export function withWhatsappPhone(href, digits) {
  const phone = String(digits ?? "").replace(/\D/g, "");
  if (!phone) return String(href ?? "");
  const value = String(href ?? "").trim();
  if (!value) return `https://wa.me/${phone}`;
  let url;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "wa.me") {
    if (url.pathname.replace(/\D/g, "") === phone) return value;
    url.pathname = `/${phone}`;
    return url.toString();
  }
  if (host === "api.whatsapp.com" || host === "web.whatsapp.com") {
    if ((url.searchParams.get("phone") || "").replace(/\D/g, "") === phone) return value;
    url.searchParams.set("phone", phone);
    return url.toString();
  }
  return value;
}

export function whatsappText(href) {
  const value = String(href ?? "").trim();
  if (!value) return "";
  try {
    return new URL(value).searchParams.get("text") || "";
  } catch {
    return "";
  }
}

export function whatsappWithMessage(href, message) {
  const phone = whatsappDigits(href);
  const text = String(message ?? "").trim();
  if (!phone) return String(href ?? "").trim();
  const url = new URL(`https://wa.me/${phone}`);
  if (text) url.searchParams.set("text", text);
  return url.toString();
}

export function applyWhatsappLink(href, digits, message) {
  const phone = String(digits ?? "").replace(/\D/g, "");
  const next = phone ? withWhatsappPhone(href, phone) : String(href ?? "");
  if (message == null) return next;
  return whatsappWithMessage(next, message);
}

export function adsConversionOrNull(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return ADS_CONVERSION.test(text) ? text : null;
}

function jsString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/</g, "\\u003c");
}

export function gaSnippet() {
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GA_MEASUREMENT_ID}');
</script>`;
}

export function adsSnippet(sendTo) {
  const value = adsConversionOrNull(sendTo);
  if (!value) return "";
  const id = jsString(value.split("/")[0]);
  const send = jsString(value);
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
  function gtag_report_conversion(url) {
    var callback = function () {
      if (typeof url !== 'undefined') { window.location = url; }
    };
    gtag('event', 'conversion', {
      'send_to': '${send}',
      'event_callback': callback
    });
    return false;
  }
</script>`;
}

export function consultaClickScript() {
  return `<script>
document.querySelectorAll("a.hero__cta, a.wa-float").forEach(function (node) {
  if (node.closest(".faq-link")) return;
  node.addEventListener("click", function () {
    var href = node.getAttribute("href") || "";
    if (!/wa\\.me|api\\.whatsapp\\.com|web\\.whatsapp\\.com/i.test(href)) return;
    if (typeof gtag_report_conversion === "function") gtag_report_conversion();
  });
});
</script>`;
}
