var server = "https://renovaapi-production.up.railway.app";
var serverV3 = "https://renova-svc-api-v3-production.up.railway.app";

function cargarListas(listCode) {
	$.getJSON(server + "/listas", function (data) {
		var cantidad = data.length;
		var idColor = 1;
		for (var i = 0; i < cantidad; i++) {
			var divCompetencia = $(".competenciaPlantilla")
				.clone()
				.removeClass("competenciaPlantilla");

			var url = "listaEspecifica2.html?id=" + data[i].codigo;

			$(divCompetencia).find(".link2").attr("href", url);
			$(divCompetencia)
				.find(".titulo")
				.text(data[i].descripcion)
				.attr("href", url);

			$(divCompetencia).find(".mes").text(data[i].mes || "");
			$(divCompetencia).find(".mes2").text(data[i].mes2 || "");
			$(divCompetencia).find(".aumento").text(data[i].aumento || "");

			$(divCompetencia).find(".card").addClass("color" + idColor);

			$(".competencias").append(divCompetencia);
			$(divCompetencia).show();
		}
		$("#spinnerListas").remove();
	}).fail(function () {
		$("#spinnerListas").remove();
		$(".competencias").html("<p style='color:white; padding:2rem;'>No se pudo cargar la lista. Intentá de nuevo más tarde.</p>");
	});
}

/** Deja solo dígitos del CUIT (quita guiones, espacios y cualquier otro carácter no numérico). */
function normalizarCuit(valor) {
	if (valor == null) return "";
	var s = String(valor).trim();
	return s.replace(/\D/g, "");
}

/**
 * Credenciales passkey para clientes potenciales (sin registro).
 * Usuario: renova. Contraseñas: reventa, invitado, taller. Permiten ver la lista indicada sin llamar al backend.
 */
var PASSKEYS_LISTAS = [
	{ usuario: "renova", contrasena: "reventa", listCode: "1" },
	{ usuario: "renova", contrasena: "invitado", listCode: "2" },
	{ usuario: "renova", contrasena: "taller", listCode: "3" }
];

function validarPasskeyLista(numCliente, cuit) {
	var user = String(numCliente || "").trim().toLowerCase();
	var pass = String(cuit || "").trim().toLowerCase();
	for (var i = 0; i < PASSKEYS_LISTAS.length; i++) {
		var p = PASSKEYS_LISTAS[i];
		if (user === p.usuario && pass === p.contrasena) return p.listCode;
	}
	return null;
}

async function hacerLogin(numCliente, cuit) {
	var errorMsg = document.getElementById("errorMsg");
	var btnLogin = document.getElementById("btnLogin");

	errorMsg.style.display = "none";
	btnLogin.disabled = true;
	btnLogin.textContent = "Verificando...";

	// Validar passkeys para clientes potenciales (antes de llamar al backend)
	var listCodePasskey = validarPasskeyLista(numCliente, cuit);
	if (listCodePasskey) {
		try {
			localStorage.setItem("renova_listCode", listCodePasskey);
			localStorage.setItem("renova_numCliente", String(numCliente).trim());
			localStorage.setItem("renova_cuit", String(cuit).trim());
		} catch (e) {}
		if (typeof window.registrarIngresoAListas === "function") {
			window.registrarIngresoAListas(String(numCliente).trim(), listCodePasskey, "Potencial - Lista " + listCodePasskey);
		}
		document.getElementById("nombreLista").textContent = "Lista de Precios (vista previa)";
		document.getElementById("loginSection").style.display = "none";
		document.getElementById("listasSection").style.display = "block";
		cargarListas(listCodePasskey);
		btnLogin.disabled = false;
		btnLogin.textContent = "Iniciar sesión";
		return true;
	}

	btnLogin.disabled = false;
	btnLogin.textContent = "Iniciar sesión";

	if (cuit.length < 10) {
		errorMsg.textContent = "CUIT inválido. Debe tener al menos 10 dígitos.";
		errorMsg.style.display = "block";
		return false;
	}

	btnLogin.disabled = true;
	btnLogin.textContent = "Verificando...";

	try {
		await $.ajax({
			url: server + "/generalValidateUser",
			method: "POST",
			contentType: "application/json",
			dataType: "json",
			data: JSON.stringify({ numCliente: numCliente, password: cuit }),
		});

		btnLogin.textContent = "Obteniendo lista...";

		var listCodeResponse = await $.getJSON(
			serverV3 + "/api/clients/" + numCliente + "/list-code"
		);

		var listCode = null;
		var clientName = "";
		if (Array.isArray(listCodeResponse) && listCodeResponse.length > 0) {
			var first = listCodeResponse[0];
			listCode = first.LISTA_CODI;
			// Nombre/razón social del cliente (según lo que devuelva la API)
			clientName = (first.RAZON_SOCIAL || first.NOMBRE || first.nombre || first.clientName || first.CLIENTE_NOMBRE || first.razon_social || "").trim();
		}

		// Si la API de list-code no trajo el nombre, intentar GET /api/clients/{id}
		if (!clientName) {
			try {
				var clientData = await $.getJSON(serverV3 + "/api/clients/" + numCliente);
				if (clientData && typeof clientData === "object") {
					clientName = (clientData.RAZON_SOCIAL || clientData.razon_social || clientData.NOMBRE || clientData.nombre || clientData.clientName || clientData.name || "").trim();
				}
			} catch (e) {
				// El endpoint puede no existir o no devolver nombre; se sigue sin nombre
			}
		}

		if (listCode === undefined || listCode === null) {
			errorMsg.textContent =
				"No se encontró una lista de precios asignada para este cliente.";
			errorMsg.style.display = "block";
			btnLogin.disabled = false;
			btnLogin.textContent = "Iniciar sesión";
			return false;
		}

		try {
			localStorage.setItem("renova_numCliente", numCliente);
			localStorage.setItem("renova_cuit", cuit);
			localStorage.setItem("renova_listCode", String(listCode));
		} catch (e) {}

		if (typeof window.registrarIngresoAListas === "function") {
			window.registrarIngresoAListas(numCliente, String(listCode), clientName);
		}

		document.getElementById("nombreLista").textContent = "Lista de Precios";
		document.getElementById("loginSection").style.display = "none";
		document.getElementById("listasSection").style.display = "block";
		cargarListas(String(listCode));
		return true;
	} catch (err) {
		console.error("Error en login:", err);
		var msg = "Usuario y/o contraseña incorrectos. Verifique sus datos.";
		if (err.status === 401) {
			msg = "CUIT incorrecto para este número de cliente.";
		} else if (err.status === 500) {
			msg = "Error del servidor. Intente nuevamente más tarde.";
		}
		errorMsg.textContent = msg;
		errorMsg.style.display = "block";
		btnLogin.disabled = false;
		btnLogin.textContent = "Iniciar sesión";
		return false;
	}
}

async function loginYCargarLista(event) {
	event.preventDefault();
	var numCliente = document.getElementById("numCliente").value.trim();
	var inputCuit = document.getElementById("cuit");
	var cuitRaw = inputCuit.value;
	// Passkey usa usuario/contraseña tal cual; login normal usa CUIT solo dígitos
	if (validarPasskeyLista(numCliente, cuitRaw)) {
		await hacerLogin(numCliente, cuitRaw);
	} else {
		var cuit = normalizarCuit(cuitRaw);
		inputCuit.value = cuit;
		await hacerLogin(numCliente, cuit);
	}
}

// Si entró por "Explorar productos sin cuenta" (?explorar=1), mostrar tarjetas sin login
(function () {
	if (typeof getQueryParam !== "function") return;
	if (getQueryParam("explorar") !== "1") return;
	document.getElementById("nombreLista").textContent = "Explorar catálogo";
	document.getElementById("loginSection").style.display = "none";
	document.getElementById("listasSection").style.display = "block";
	cargarListas("");
})();

// Si hay credenciales guardadas y no estamos en modo explorar, mostrar "Verificando..." y entrar directo
(function () {
	if (typeof getQueryParam === "function" && getQueryParam("explorar") === "1") return;
	var numCliente = null;
	var cuit = null;
	try {
		numCliente = localStorage.getItem("renova_numCliente");
		cuit = localStorage.getItem("renova_cuit");
	} catch (e) {}
	if (!numCliente || !cuit) return;
	var formContainer = document.getElementById("loginFormContainer");
	var verificando = document.getElementById("verificandoCredenciales");
	var inputNum = document.getElementById("numCliente");
	var inputCuit = document.getElementById("cuit");
	if (!formContainer || !verificando || !inputNum || !inputCuit) return;
	inputNum.value = numCliente;
	inputCuit.value = cuit;
	formContainer.style.display = "none";
	verificando.style.display = "flex";
	hacerLogin(numCliente, cuit).then(function (ok) {
		if (!ok) {
			verificando.style.display = "none";
			formContainer.style.display = "block";
		}
	});
})();
