(function () {
      "use strict";

      if (sessionStorage.getItem("renova_admin") !== "1") {
            return;
      }

      var landings = [
            { name: "Flota de autos", href: "/flota-de-autos/" },
            { name: "Flota de camiones", href: "/flota-de-camiones/" },
            { name: "Agro", href: "/agro/" },
            { name: "Industria", href: "/industria/" },
            { name: "Lubricentro", href: "/lubricentro/" },
            { name: "Talleres", href: "/talleres/" },
            { name: "QAUL", href: "/qaul/" },
            { name: "Estaciones", href: "/estaciones/" },
            { name: "Revendedores", href: "/revendedores/" }
      ];
      var alta = { name: "Alta", href: "/alta/" };

      var path = window.location.pathname;
      var style = document.createElement("style");
      style.textContent = ""
            + ".renova-admin-bar{position:fixed;top:0;left:0;right:0;z-index:1500;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 16px;background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;font-size:.92rem;box-sizing:border-box;border-bottom:3px solid #e10600;}"
            + ".renova-admin-bar a{color:#1a1a1a;text-decoration:none;padding:6px 10px;border-radius:999px;}"
            + ".renova-admin-bar a.is-current{background:#f39c12;color:#1a1a1a;font-weight:700;}"
            + ".renova-admin-bar-end{margin-left:auto;display:flex;align-items:center;gap:8px;}"
            + ".renova-admin-bar button{width:auto;margin:0;border:1px solid #1a1a1a;border-radius:999px;padding:6px 12px;background:#ffffff;color:#1a1a1a;font:inherit;font-weight:700;letter-spacing:0;text-transform:none;cursor:pointer;}";
      document.head.appendChild(style);

      function linkHtml(link) {
            var current = path === link.href || path === link.href.slice(0, -1);
            return '<a href="' + link.href + '"' + (current ? ' class="is-current"' : "") + ">" + link.name + "</a>";
      }

      var bar = document.createElement("div");
      bar.className = "renova-admin-bar";
      bar.innerHTML = landings.map(linkHtml).join("")
            + '<span class="renova-admin-bar-end">' + linkHtml(alta) + '<button type="button">Salir</button></span>';

      document.body.prepend(bar);

      function fitBar() {
            document.body.style.paddingTop = (bar.offsetHeight + 8) + "px";
      }

      fitBar();
      window.addEventListener("resize", fitBar);

      bar.querySelector("button").addEventListener("click", function () {
            sessionStorage.removeItem("renova_admin");
            window.location.href = "/admin/";
      });
})();
