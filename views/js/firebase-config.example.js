/**
 * Configuración de Firebase (credenciales).
 *
 * 1. Copiá este archivo como firebase-config.js (está en .gitignore).
 * 2. Reemplazá los valores con tus credenciales de Firebase.
 *
 * Variables de entorno (producción):
 * Podés no crear firebase-config.js y en su lugar inyectar la config desde el servidor
 * con variables de entorno. En el HTML, antes de cargar firebase-config.js, definí:
 *
 *   <script>
 *     window.__FIREBASE_CONFIG__ = {
 *       apiKey: "${FIREBASE_API_KEY}",
 *       authDomain: "${FIREBASE_AUTH_DOMAIN}",
 *       projectId: "${FIREBASE_PROJECT_ID}",
 *       storageBucket: "${FIREBASE_STORAGE_BUCKET}",
 *       messagingSenderId: "${FIREBASE_MESSAGING_SENDER_ID}",
 *       appId: "${FIREBASE_APP_ID}",
 *       measurementId: "${FIREBASE_MEASUREMENT_ID}"
 *     };
 *   </script>
 *
 * y reemplazá ${...} con las env vars en tu pipeline de deploy.
 */
(function () {
	window.__FIREBASE_CONFIG__ = {
		apiKey: "TU_API_KEY",
		authDomain: "tu-proyecto.firebaseapp.com",
		projectId: "tu-proyecto",
		storageBucket: "tu-proyecto.appspot.com",
		messagingSenderId: "123456789",
		appId: "1:123456789:web:xxxxx",
		measurementId: "G-XXXX"
	};
})();
