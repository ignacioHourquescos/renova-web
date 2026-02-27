var server = "https://renovaapi-production.up.railway.app";
var NUMERO_CLIENTE_MAXIMO = 9290;

function cargarListas(listCode) {
	$.getJSON(server + "/listas", function (data) {
		var cantidad = data.length;
		var idColor = 1;
		var code = listCode != null ? listCode : "";
		for (var i = 0; i < cantidad; i++) {
			var divCompetencia = $(".competenciaPlantilla")
				.clone()
				.removeClass("competenciaPlantilla");

			var url = "listaEspecifica2.html?id=" + data[i].codigo;
			if (code !== "") url += "&listCode=" + code;

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

async function hacerLogin(numCliente, cuit) {
	var errorMsg = document.getElementById("errorMsg");
	var btnLogin = document.getElementById("btnLogin");

	errorMsg.style.display = "none";

	var numClienteNum = parseInt(numCliente, 10);
	var esClienteNuevo = !isNaN(numClienteNum) && numClienteNum > NUMERO_CLIENTE_MAXIMO;

	try {
		if (esClienteNuevo) {
			localStorage.setItem("renova_cliente_restringido", "1");
		} else {
			localStorage.setItem("renova_cliente_restringido", "0");
		}
	} catch (e) {}

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

		var clientDetails = await $.getJSON(
			server + "/getClient?clientId=" + numCliente
		);

		var listCode = clientDetails.LISTA_CODI;

		if (listCode === undefined || listCode === null) {
			errorMsg.textContent =
				"No se encontró una lista de precios asignada para este cliente.";
			errorMsg.style.display = "block";
			btnLogin.disabled = false;
			btnLogin.textContent = "Iniciar sesión";
			return false;
		}

		// Guardar credenciales para la próxima vez
		try {
			localStorage.setItem("renova_numCliente", numCliente);
			localStorage.setItem("renova_cuit", cuit);
		} catch (e) {}

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
	var cuit = document.getElementById("cuit").value.trim();
	await hacerLogin(numCliente, cuit);
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
