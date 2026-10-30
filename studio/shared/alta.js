import { DEFAULT_WHATSAPP } from "./tracking.js";

export const IVA_OPTIONS = [
  "Responsable inscripto",
  "Monotributo",
  "Exento",
  "Consumidor final",
];

export const PROVINCIA_OPTIONS = [
  "Ciudad Autónoma de Buenos Aires",
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

export const LANDING_LABELS = {
  flotas: "Vengo de la landing de Flotas",
  "flota-autos": "Vengo de la landing de Flota de autos",
  "flota-de-autos": "Vengo de la landing de Flota de autos",
  "flota-camiones": "Vengo de la landing de Flota de camiones",
  "flota-de-camiones": "Vengo de la landing de Flota de camiones",
  agro: "Vengo de la landing de Agro",
  industria: "Vengo de la landing de Industria",
  lubricentro: "Vengo de la landing de Lubricentro",
  talleres: "Vengo de la landing de Talleres",
  qaul: "Vengo de la landing de QAUL",
  estaciones: "Vengo de la landing de Estaciones",
  revendedores: "Vengo de la landing de Revendedores",
};

function validCuit(value) {
  var digits = String(value || "").replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) return false;
  var weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  var sum = 0;
  for (var i = 0; i < 10; i++) sum += weights[i] * Number(digits.charAt(i));
  var mod = sum % 11;
  var check = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod;
  return check === Number(digits.charAt(10));
}

function formatCuit(value) {
  var digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11) return String(value || "").trim();
  return digits.slice(0, 2) + "-" + digits.slice(2, 10) + "-" + digits.slice(10);
}

function cuitCheck(value) {
  var digits = String(value || "").replace(/\D/g, "");
  if (!digits) return { state: "empty", text: "" };
  if (digits.length !== 11) return { state: "incomplete", text: "Tiene que tener 11 números, como 20-12345678-6." };
  if (!validCuit(digits)) return { state: "bad", text: "El dígito verificador no cierra. El CUIT/CUIL no está bien armado." };
  return { state: "ok", text: "CUIT/CUIL bien armado." };
}

function emailCheck(value) {
  var text = String(value || "").trim();
  if (!text) return { state: "empty", text: "" };
  var parts = text.split("@");
  var message = "El email no está bien armado. Tiene que ser como tu@email.com.";
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { state: "incomplete", text: message };
  var labels = parts[1].split(".");
  var localOk = parts[0].length <= 64 && !/^\.|\.$|\.\./.test(parts[0]) && !/\s/.test(parts[0]);
  var domainOk = labels.length >= 2 && labels.every(function (label) {
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label);
  }) && /^[a-zA-Z]{2,}$/.test(labels[labels.length - 1]);
  if (localOk && domainOk) return { state: "ok", text: "Email bien armado." };
  if (parts[1].indexOf(".") === -1) return { state: "incomplete", text: message };
  return { state: "bad", text: message };
}

export function altaBindScript(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const PHONE = digits.length >= 8 && digits.length <= 15 ? digits : DEFAULT_WHATSAPP;
  return `(function () {
  ${validCuit.toString()}
  ${formatCuit.toString()}
  ${cuitCheck.toString()}
  ${emailCheck.toString()}
  var LABELS = ${JSON.stringify(LANDING_LABELS)};
  var PHONE = ${JSON.stringify(PHONE)};
  var forms = document.querySelectorAll("form.alta__form");
  for (var i = 0; i < forms.length; i++) bind(forms[i]);

  function countAltaClick() {
    var config = window.__LANDING_FIREBASE_CONFIG__;
    if (!config || !config.apiKey || !config.projectId) return;
    var key = "renova:alta:wpp";
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch (error) {
      return;
    }
    var docName = "projects/" + config.projectId + "/databases/(default)/documents/landings_statistics_dev/alta";
    var url = "https://firestore.googleapis.com/v1/projects/" + config.projectId + "/databases/(default)/documents:commit?key=" + encodeURIComponent(config.apiKey);
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        writes: [{
          transform: {
            document: docName,
            fieldTransforms: [{ fieldPath: "wppClicks", increment: { integerValue: "1" } }]
          }
        }]
      })
    }).then(function (response) {
      if (!response.ok) throw new Error("stats");
    }).catch(function () {
      try { localStorage.removeItem(key); } catch (error) {}
    });
  }

  function bind(form) {
    if (form.getAttribute("data-bound") === "1") return;
    form.setAttribute("data-bound", "1");
    var root = form.closest(".alta") || document.body;
    var origen = root.querySelector(".alta__origen");
    var landing = "";
    try { landing = sessionStorage.getItem("renova_landing") || ""; } catch (error) { landing = ""; }
    if (origen && LABELS[landing]) {
      origen.textContent = LABELS[landing];
      origen.hidden = false;
    }

    var misma = form.querySelector("[name=misma_entrega]");
    var entrega = form.querySelector(".alta__entrega");
    function syncEntrega() {
      var same = !misma || misma.checked;
      if (entrega) entrega.hidden = same;
      var fields = entrega ? entrega.querySelectorAll("input, select, textarea") : [];
      for (var n = 0; n < fields.length; n++) {
        var field = fields[n];
        field.disabled = same;
        if (field.name === "entrega_cp") continue;
        if (same) field.removeAttribute("required");
        else field.setAttribute("required", "");
      }
    }
    if (misma) misma.addEventListener("change", syncEntrega);
    syncEntrega();

    var cuitInput = form.querySelector("[name=cuit]");
    var cuitNote = form.querySelector("[data-cuit-note]");
    function paintCuit(finished) {
      if (!cuitInput) return false;
      var check = cuitCheck(cuitInput.value);
      if (check.state === "ok") cuitInput.value = formatCuit(cuitInput.value);
      var showNote = check.state === "ok" || check.state === "bad" || (finished && check.state === "incomplete");
      if (cuitNote) {
        cuitNote.hidden = !showNote;
        cuitNote.textContent = showNote ? check.text : "";
        cuitNote.className = check.state === "ok" ? "alta__cuit alta__cuit--ok" : "alta__cuit alta__cuit--bad";
      }
      if (check.state === "bad" || (finished && check.state === "incomplete")) cuitInput.setAttribute("aria-invalid", "true");
      else cuitInput.removeAttribute("aria-invalid");
      return check.state === "ok";
    }
    if (cuitInput) {
      cuitInput.addEventListener("input", function () { paintCuit(false); });
      cuitInput.addEventListener("blur", function () { paintCuit(true); });
    }

    var emailInput = form.querySelector("[name=email]");
    var emailNote = form.querySelector("[data-email-note]");
    function paintEmail(finished) {
      if (!emailInput) return false;
      var check = emailCheck(emailInput.value);
      if (check.state === "ok") emailInput.value = String(emailInput.value || "").trim();
      var showNote = check.state === "ok" || check.state === "bad" || (finished && check.state === "incomplete");
      if (emailNote) {
        emailNote.hidden = !showNote;
        emailNote.textContent = showNote ? check.text : "";
        emailNote.className = check.state === "ok" ? "alta__cuit alta__cuit--ok" : "alta__cuit alta__cuit--bad";
      }
      if (check.state === "bad" || (finished && check.state === "incomplete")) emailInput.setAttribute("aria-invalid", "true");
      else emailInput.removeAttribute("aria-invalid");
      return check.state === "ok";
    }
    if (emailInput) {
      emailInput.addEventListener("input", function () { paintEmail(false); });
      emailInput.addEventListener("blur", function () { paintEmail(true); });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var button = form.querySelector(".alta__submit");
      var error = form.querySelector(".alta__error");
      var ok = root.querySelector(".alta__ok");
      if (!button || button.disabled) return;
      function show(text) {
        if (!error) return;
        error.textContent = text || "";
      }
      var data = new FormData(form);
      if (String(data.get("_honey") || "").trim()) {
        form.hidden = true;
        if (ok) ok.hidden = false;
        return;
      }
      var cuitOk = paintCuit(true);
      var emailOk = paintEmail(true);
      if (!form.reportValidity()) return;
      if (!cuitOk) {
        show("");
        if (cuitInput) cuitInput.focus();
        return;
      }
      if (!emailOk) {
        show("");
        if (emailInput) emailInput.focus();
        return;
      }
      var cuit = String(data.get("cuit") || "");
      var telefono = String(data.get("telefono") || "").replace(/\\D/g, "");
      if (telefono.length < 8) {
        show("El teléfono tiene que incluir el código de área.");
        return;
      }
      show("");
      button.disabled = true;
      button.textContent = "Enviando…";
      if (typeof gtag_report_conversion === "function") gtag_report_conversion();
      countAltaClick();
      function read(name) { return String(data.get(name) || "").trim(); }
      var lines = [
        "Hola, quiero darme de alta.",
        "Razón social: " + read("razon"),
        "CUIT/CUIL: " + formatCuit(cuit),
        "Condición IVA: " + read("iva"),
        "Nombre: " + read("nombre"),
        "Teléfono: " + read("telefono"),
        "Email: " + read("email"),
        "Domicilio fiscal: " + read("direccion"),
        "Localidad: " + read("localidad"),
        "Provincia: " + read("provincia")
      ];
      if (read("cp")) lines.push("Código postal: " + read("cp"));
      if (misma && misma.checked) {
        lines.push("Dirección de entrega: la misma que el domicilio fiscal");
      } else {
        lines.push("Dirección de entrega: " + read("entrega_direccion"));
        lines.push("Localidad de entrega: " + read("entrega_localidad"));
        lines.push("Provincia de entrega: " + read("entrega_provincia"));
        if (read("entrega_cp")) lines.push("Código postal de entrega: " + read("entrega_cp"));
      }
      if (read("comentario")) lines.push("Comentario: " + read("comentario"));
      if (LABELS[landing]) lines.push(LABELS[landing]);
      var mensaje = lines.join("\\n");
      if (window.RenovaWhatsApp) window.RenovaWhatsApp.open(mensaje);
      else window.open("https://wa.me/" + PHONE + "?text=" + encodeURIComponent(mensaje), "_blank");
      form.hidden = true;
      if (ok) ok.hidden = false;
    });
  }
})();`;
}
