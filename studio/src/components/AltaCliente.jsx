import { useEffect, useRef } from "react";
import { altaBindScript, IVA_OPTIONS, PROVINCIA_OPTIONS } from "../../shared/alta.js";

function SelectField({ name, label, options, wide, disabled }) {
  return (
    <label className={wide ? "alta__field alta__field--wide" : "alta__field"}>
      <span>{label}</span>
      <select name={name} required={!disabled} disabled={disabled || undefined} defaultValue="">
        <option value="" disabled>Elegí una opción</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function AltaCliente({ logoSrc = "/logo-renova.png", phone = "" }) {
  const formRef = useRef(null);
  const scriptText = altaBindScript(phone);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return undefined;
    if (form.getAttribute("data-bound") === "1" && form.getAttribute("data-phone") === scriptText) return undefined;
    form.removeAttribute("data-bound");
    form.setAttribute("data-phone", scriptText);
    const doc = form.ownerDocument;
    const script = doc.createElement("script");
    script.textContent = scriptText;
    doc.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [scriptText]);

  return (
    <main className="alta">
      <header className="alta__bar">
        <img src={logoSrc} alt="Renova" />
      </header>
      <div className="alta__wrap">
        <h1>Alta de cliente</h1>
        <p className="alta__lead">
          Completá los datos de tu empresa para darte de alta como cliente mayorista.
        </p>
        <form ref={formRef} className="alta__form" method="post" action="#alta">
          <input className="alta__honey" type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <fieldset className="alta__group">
            <legend>Empresa</legend>
            <div className="alta__grid">
              <label className="alta__field alta__field--wide">
                <span>Razón social</span>
                <input name="razon" type="text" autoComplete="organization" placeholder="Razón social" required />
              </label>
              <label className="alta__field">
                <span>CUIT / CUIL</span>
                <input name="cuit" type="text" inputMode="numeric" autoComplete="off" placeholder="20-12345678-6" aria-describedby="cuit-note" required />
                <small id="cuit-note" className="alta__cuit" data-cuit-note hidden />
              </label>
              <SelectField name="iva" label="Condición IVA" options={IVA_OPTIONS} />
            </div>
          </fieldset>
          <fieldset className="alta__group">
            <legend>Contacto</legend>
            <div className="alta__grid">
              <label className="alta__field">
                <span>Nombre</span>
                <input name="nombre" type="text" autoComplete="name" placeholder="Tu nombre" required />
              </label>
              <label className="alta__field">
                <span>Teléfono</span>
                <input name="telefono" type="tel" autoComplete="tel" placeholder="+54 9 11 …" required />
              </label>
              <label className="alta__field alta__field--wide">
                <span>Email</span>
                <input name="email" type="text" inputMode="email" autoComplete="email" placeholder="tu@email.com" aria-describedby="email-note" required />
                <small id="email-note" className="alta__cuit" data-email-note hidden />
              </label>
            </div>
          </fieldset>
          <fieldset className="alta__group">
            <legend>Domicilio fiscal</legend>
            <div className="alta__grid">
              <label className="alta__field alta__field--wide">
                <span>Dirección</span>
                <input name="direccion" type="text" autoComplete="street-address" placeholder="Calle y número" required />
              </label>
              <label className="alta__field">
                <span>Localidad</span>
                <input name="localidad" type="text" autoComplete="address-level2" placeholder="Localidad" required />
              </label>
              <SelectField name="provincia" label="Provincia" options={PROVINCIA_OPTIONS} />
              <label className="alta__field">
                <span>Código postal</span>
                <input name="cp" type="text" inputMode="numeric" autoComplete="postal-code" placeholder="1414" />
              </label>
            </div>
          </fieldset>
          <fieldset className="alta__group">
            <legend>Dirección de entrega</legend>
            <label className="alta__check">
              <input name="misma_entrega" type="checkbox" value="si" defaultChecked />
              <span>La dirección de entrega es la misma que el domicilio fiscal</span>
            </label>
            <div className="alta__entrega" hidden>
              <div className="alta__grid">
                <label className="alta__field alta__field--wide">
                  <span>Dirección</span>
                  <input name="entrega_direccion" type="text" autoComplete="section-shipping street-address" placeholder="Calle y número" disabled />
                </label>
                <label className="alta__field">
                  <span>Localidad</span>
                  <input name="entrega_localidad" type="text" autoComplete="section-shipping address-level2" placeholder="Localidad" disabled />
                </label>
                <SelectField name="entrega_provincia" label="Provincia" options={PROVINCIA_OPTIONS} disabled />
                <label className="alta__field">
                  <span>Código postal</span>
                  <input name="entrega_cp" type="text" inputMode="numeric" autoComplete="section-shipping postal-code" placeholder="1414" disabled />
                </label>
              </div>
            </div>
          </fieldset>
          <label className="alta__field alta__field--wide alta__comment">
            <span>Comentario</span>
            <textarea name="comentario" rows={3} placeholder="Algo que tengamos que saber para el alta" />
          </label>
          <button className="alta__submit" type="submit">Solicitar alta</button>
          <p className="alta__error" role="alert" />
          <p className="alta__fine">
            Usamos estos datos solo para darte de alta y contactarte. Podés pedir acceso o baja en renovafiltros@gmail.com.
          </p>
        </form>
        <p className="alta__ok" hidden>Listo. Recibimos tu solicitud de alta.</p>
        <p className="alta__origen" hidden />
        <noscript>
          <p className="alta__error">Para enviar el alta, activá JavaScript en el navegador.</p>
        </noscript>
      </div>
      <script dangerouslySetInnerHTML={{ __html: scriptText }} />
    </main>
  );
}
