import { useEffect, useRef, useState } from "react";
import { SectionTitle } from "./SectionTitle.jsx";

const INBOX = "renovafiltros@gmail.com";
const FORM_ACTION = `https://formsubmit.co/${INBOX}`;
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${INBOX}`;
const OK_TEXT = "Listo. Recibimos tu consulta y te escribimos a la brevedad.";
const ERROR_TEXT = "No se pudo enviar. Probá de nuevo o escribinos por WhatsApp.";
const FILE_LIMIT = 10 * 1024 * 1024;
const FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.csv,.doc,.docx,.txt";
const FILE_PATTERN = /\.(pdf|png|jpe?g|webp|xls|xlsx|csv|docx?|txt)$/i;
const SMALL_WORDS = new Set(["a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "los", "o", "para", "por", "tu", "u", "y"]);
const PUBLIC_ORIGIN = "https://www.distribuidorarenova.com.ar";

function landingSlug(source) {
  return String(source || "").trim().replace(/^\/+|\/+$/g, "");
}

function landingLabel(source) {
  return landingSlug(source)
    .split("-")
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function subjectFor(source) {
  const label = landingLabel(source);
  return label ? `Nuevo presupuesto desde ${label}` : "Nuevo presupuesto desde la web";
}

function landingPage(source) {
  const slug = landingSlug(source);
  return slug ? `${PUBLIC_ORIGIN}/${slug}/` : "";
}

const FIELDS = [
  { name: "nombre", label: "Nombre", placeholder: "Tu nombre", autoComplete: "name", required: true },
  { name: "email", label: "Email", placeholder: "tu@email.com", type: "email", autoComplete: "email" },
  { name: "telefono", label: "Teléfono", placeholder: "+54 9 11 …", type: "tel", autoComplete: "tel", required: true, wide: true },
];

function fileKey(file) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function sameFile(left, right) {
  return left.name === right.name && left.size === right.size && left.lastModified === right.lastModified;
}

function collectFiles(current, incoming) {
  const next = current.slice();
  let rejected = "";
  for (const file of incoming) {
    if (!FILE_PATTERN.test(file.name)) {
      rejected = "Ese tipo de archivo no se puede adjuntar.";
      continue;
    }
    if (next.some((item) => sameFile(item, file))) continue;
    next.push(file);
  }
  const total = next.reduce((sum, file) => sum + file.size, 0);
  if (total > FILE_LIMIT) {
    return { files: current, error: "Los archivos superan 10 MB en total." };
  }
  return { files: next, error: rejected };
}

function quoteBody(data, files, source) {
  const read = (name) => String(data.get(name) || "").trim();
  const email = read("email");
  const label = landingLabel(source);
  const page = landingPage(source);
  const body = new FormData();
  body.append("_subject", subjectFor(source));
  body.append("_template", "table");
  body.append("_captcha", "false");
  if (label) body.append("Landing", label);
  if (page) body.append("Página", page);
  body.append("Nombre", read("nombre"));
  body.append("Teléfono", read("telefono"));
  const mensaje = read("mensaje");
  if (mensaje) body.append("Mensaje", mensaje);
  if (email) {
    body.append("email", email);
    body.append("_replyto", email);
  }
  for (const file of files) body.append("attachment", file, file.name);
  return body;
}

async function postQuote(data, files, source) {
  if (String(data.get("_honey") || "").trim()) return;
  const response = await fetch(FORM_ENDPOINT, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: quoteBody(data, files, source),
  });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  const success = body.success === true || body.success === "true";
  if (!response.ok || !success) {
    throw new Error(body.message || ERROR_TEXT);
  }
}

function bindScript(source) {
  const label = landingLabel(source);
  const page = landingPage(source);
  const originLines = [
    label ? `body.append("Landing", ${JSON.stringify(label)});` : "",
    page ? `body.append("Página", ${JSON.stringify(page)});` : "",
  ].filter(Boolean).join("\n      ");
  return `(function () {
  var LIMIT = ${FILE_LIMIT};
  var PATTERN = ${FILE_PATTERN.toString()};
  var forms = document.querySelectorAll("form.formulario__form");
  for (var i = 0; i < forms.length; i++) bind(forms[i]);

  function bind(form) {
    if (form.getAttribute("data-bound") === "1") return;
    form.setAttribute("data-bound", "1");
    var files = [];
    var drop = form.querySelector(".formulario__drop");
    var input = form.querySelector(".formulario__file");
    var list = form.querySelector(".formulario__files");
    var note = form.querySelector(".formulario__file-note");

    function showNote(text) {
      if (!note) return;
      note.textContent = text || "";
      note.hidden = !text;
    }

    function render() {
      if (!list) return;
      list.textContent = "";
      files.forEach(function (file, index) {
        var item = document.createElement("li");
        var name = document.createElement("span");
        name.textContent = file.name;
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = "×";
        button.setAttribute("aria-label", "Quitar " + file.name);
        button.addEventListener("click", function () {
          files.splice(index, 1);
          render();
        });
        item.appendChild(name);
        item.appendChild(button);
        list.appendChild(item);
      });
    }

    function add(incoming) {
      var rejected = "";
      var next = files.slice();
      for (var n = 0; n < incoming.length; n++) {
        var file = incoming[n];
        if (!PATTERN.test(file.name)) {
          rejected = "Ese tipo de archivo no se puede adjuntar.";
          continue;
        }
        var exists = next.some(function (item) {
          return item.name === file.name && item.size === file.size && item.lastModified === file.lastModified;
        });
        if (!exists) next.push(file);
      }
      var total = next.reduce(function (sum, file) { return sum + file.size; }, 0);
      if (total > LIMIT) {
        showNote("Los archivos superan 10 MB en total.");
        return;
      }
      files.splice(0, files.length);
      next.forEach(function (file) { files.push(file); });
      showNote(rejected);
      render();
    }

    if (drop && input) {
      drop.addEventListener("dragover", function (event) {
        event.preventDefault();
        drop.classList.add("formulario__drop--over");
      });
      drop.addEventListener("dragleave", function (event) {
        if (drop.contains(event.relatedTarget)) return;
        drop.classList.remove("formulario__drop--over");
      });
      drop.addEventListener("drop", function (event) {
        event.preventDefault();
        drop.classList.remove("formulario__drop--over");
        if (event.dataTransfer && event.dataTransfer.files.length) add(event.dataTransfer.files);
      });
      input.addEventListener("change", function () {
        if (input.files && input.files.length) add(input.files);
        input.value = "";
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var button = form.querySelector(".formulario__submit");
      var status = form.querySelector(".formulario__status");
      if (!button || button.disabled) return;
      var data = new FormData(form);
      function show(text, failed) {
        if (!status) return;
        status.textContent = text;
        status.className = failed ? "formulario__status formulario__status--error" : "formulario__status";
      }
      if (String(data.get("_honey") || "").trim()) {
        show(${JSON.stringify(OK_TEXT)}, false);
        form.reset();
        files.splice(0, files.length);
        render();
        return;
      }
      var original = button.textContent;
      button.disabled = true;
      button.textContent = "Enviando…";
      var body = new FormData();
      function read(name) { return String(data.get(name) || "").trim(); }
      var email = read("email");
      body.append("_subject", ${JSON.stringify(subjectFor(source))});
      body.append("_template", "table");
      body.append("_captcha", "false");
      ${originLines}
      body.append("Nombre", read("nombre"));
      body.append("Teléfono", read("telefono"));
      if (read("mensaje")) body.append("Mensaje", read("mensaje"));
      if (email) {
        body.append("email", email);
        body.append("_replyto", email);
      }
      files.forEach(function (file) { body.append("attachment", file, file.name); });
      fetch(${JSON.stringify(FORM_ENDPOINT)}, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: body
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (payload) {
          var success = payload.success === true || payload.success === "true";
          if (!response.ok || !success) throw new Error("fail");
        });
      }).then(function () {
        show(${JSON.stringify(OK_TEXT)}, false);
        form.reset();
        files.splice(0, files.length);
        render();
        button.textContent = original;
        button.disabled = false;
      }).catch(function () {
        show(${JSON.stringify(ERROR_TEXT)}, true);
        button.textContent = original;
        button.disabled = false;
      });
    });
  }
})();`;
}

export function Formulario({ source = "" }) {
  const formRef = useRef(null);
  const filesRef = useRef([]);
  const [files, setFiles] = useState([]);
  const [fileNote, setFileNote] = useState("");
  const [phase, setPhase] = useState("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const form = formRef.current;
    if (!form || form.getAttribute("data-bound") === "1") return undefined;
    form.setAttribute("data-bound", "1");
    const drop = form.querySelector(".formulario__drop");
    const input = form.querySelector(".formulario__file");

    const add = (incoming) => {
      const result = collectFiles(filesRef.current, incoming);
      filesRef.current = result.files;
      setFiles(result.files);
      setFileNote(result.error);
    };

    const onDragOver = (event) => {
      event.preventDefault();
      drop.classList.add("formulario__drop--over");
    };
    const onDragLeave = (event) => {
      if (drop.contains(event.relatedTarget)) return;
      drop.classList.remove("formulario__drop--over");
    };
    const onDrop = (event) => {
      event.preventDefault();
      drop.classList.remove("formulario__drop--over");
      if (event.dataTransfer?.files?.length) add(event.dataTransfer.files);
    };
    const onChange = () => {
      if (input.files?.length) add(input.files);
      input.value = "";
    };
    const onClick = (event) => {
      const button = event.target.closest("[data-remove]");
      if (!button || !form.contains(button)) return;
      const key = button.getAttribute("data-remove");
      const next = filesRef.current.filter((file) => fileKey(file) !== key);
      filesRef.current = next;
      setFiles(next);
      setFileNote("");
    };
    const onSubmit = async (event) => {
      event.preventDefault();
      const button = form.querySelector(".formulario__submit");
      if (button?.disabled) return;
      const data = new FormData(form);
      if (String(data.get("_honey") || "").trim()) {
        filesRef.current = [];
        setFiles([]);
        setPhase("ok");
        setNotice(OK_TEXT);
        form.reset();
        return;
      }
      setPhase("sending");
      setNotice("");
      try {
        await postQuote(data, filesRef.current, source);
        filesRef.current = [];
        setFiles([]);
        setFileNote("");
        setPhase("ok");
        setNotice(OK_TEXT);
        form.reset();
      } catch {
        setPhase("error");
        setNotice(ERROR_TEXT);
      }
    };

    drop.addEventListener("dragover", onDragOver);
    drop.addEventListener("dragleave", onDragLeave);
    drop.addEventListener("drop", onDrop);
    input.addEventListener("change", onChange);
    form.addEventListener("click", onClick);
    form.addEventListener("submit", onSubmit);
    return () => {
      drop.removeEventListener("dragover", onDragOver);
      drop.removeEventListener("dragleave", onDragLeave);
      drop.removeEventListener("drop", onDrop);
      input.removeEventListener("change", onChange);
      form.removeEventListener("click", onClick);
      form.removeEventListener("submit", onSubmit);
      form.removeAttribute("data-bound");
    };
  }, [source]);

  return (
    <section className="formulario" aria-labelledby="formulario-title">
      <div className="formulario__inner">
        <SectionTitle id="formulario-title" title="Contáctenos" />
        <form
          ref={formRef}
          className="formulario__form"
          action={FORM_ACTION}
          method="POST"
          encType="multipart/form-data"
          acceptCharset="UTF-8"
        >
          <input type="hidden" name="_subject" value={subjectFor(source)} />
          <input type="hidden" name="_template" value="table" />
          <input type="hidden" name="_captcha" value="false" />
          {landingLabel(source) ? <input type="hidden" name="Landing" value={landingLabel(source)} /> : null}
          {landingPage(source) ? <input type="hidden" name="Página" value={landingPage(source)} /> : null}
          <input className="formulario__honey" type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <div className="formulario__grid">
            {FIELDS.map((field) => (
              <label className={field.wide ? "formulario__field formulario__field--wide" : "formulario__field"} key={field.name}>
                <span>{field.label}</span>
                <input
                  name={field.name}
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  required={field.required || undefined}
                />
              </label>
            ))}
            <label className="formulario__field formulario__field--wide">
              <span>Mensaje</span>
              <textarea name="mensaje" placeholder="Contanos qué necesitás" rows={4} />
            </label>
            <div className="formulario__field formulario__field--wide">
              <span>Archivos</span>
              <div className="formulario__drop">
                <input
                  className="formulario__file"
                  type="file"
                  multiple
                  accept={FILE_ACCEPT}
                  aria-label="Adjuntar archivos"
                />
                <strong>Arrastrá archivos acá o hacé clic para elegirlos</strong>
                <small>Listado, foto o PDF. Hasta 10 MB.</small>
              </div>
              <ul className="formulario__files">
                {files.map((file) => (
                  <li key={fileKey(file)}>
                    <span>{file.name}</span>
                    <button type="button" data-remove={fileKey(file)} aria-label={`Quitar ${file.name}`}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <p className="formulario__file-note" hidden={!fileNote}>{fileNote}</p>
            </div>
          </div>
          <button className="formulario__submit" type="submit" disabled={phase === "sending"}>
            {phase === "sending" ? "Enviando…" : "Enviar consulta"}
            {phase === "sending" ? null : <span aria-hidden="true">→</span>}
          </button>
          <p
            className={phase === "error" ? "formulario__status formulario__status--error" : "formulario__status"}
            role="status"
            aria-live="polite"
          >
            {notice}
          </p>
        </form>
      </div>
      <script dangerouslySetInnerHTML={{ __html: bindScript(source) }} />
    </section>
  );
}
