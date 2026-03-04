/**
 * Inicializa Firebase/Firestore y registra ingresos a listas en la colección ingreso_a_listas.
 * Depende de firebase-config.js (o window.__FIREBASE_CONFIG__) y del SDK de Firebase en la página.
 */
(function () {
	var firestore = null;

	function init() {
		if (!window.firebase || !window.__FIREBASE_CONFIG__) return;
		var config = window.__FIREBASE_CONFIG__;
		if (!config.projectId || !config.apiKey) return;
		try {
			if (!window.firebase.apps.length) {
				window.firebase.initializeApp(config);
			}
			firestore = window.firebase.firestore();
		} catch (e) {
			console.warn("Firebase init:", e);
		}
	}

	/**
	 * Registra una sesión de ingreso a listas en Firestore (colección ingreso_a_listas).
	 * @param {string} clientId - Número de cliente (ej: "9291").
	 * @param {string} [listCode] - Código de lista que va a ver el usuario (opcional).
	 * @param {string} [clientName] - Nombre/razón social del cliente (opcional).
	 */
	function registrarIngresoAListas(clientId, listCode, clientName) {
		if (!firestore) {
			init();
			if (!firestore) {
				console.error("[Firestore] No se pudo inicializar. Revisá que firebase-config.js exista y defina window.__FIREBASE_CONFIG__ (apiKey, projectId).");
				return;
			}
		}
		try {
			var doc = {
				Client: String(clientId),
				fecha: window.firebase.firestore.FieldValue.serverTimestamp(),
				tipo: "sesion"
			};
			if (listCode != null && String(listCode).trim() !== "") {
				doc.listCode = String(listCode).trim();
			}
			if (clientName != null && String(clientName).trim() !== "") {
				doc.ClientName = String(clientName).trim();
			}
			firestore.collection("ingreso_a_listas").add(doc)
				.then(function () {
					console.info("[Firestore] Sesión registrada: Client " + clientId + ", listCode " + (doc.listCode || "(sin listCode)"));
				})
				.catch(function (err) {
					console.error("[Firestore] Error al guardar sesión en ingreso_a_listas:", err);
				});
		} catch (e) {
			console.error("[Firestore] registrarIngresoAListas:", e);
		}
	}

	window.registrarIngresoAListas = registrarIngresoAListas;
	init();
})();
