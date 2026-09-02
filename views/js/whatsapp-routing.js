(function (window) {
	"use strict";

	var WHATSAPP_NUMBER = "5491140565047";

	function getPhoneNumber() {
		return WHATSAPP_NUMBER;
	}

	function buildUrl(message) {
		var url = "https://wa.me/" + getPhoneNumber();

		if (message) {
			url += "?text=" + encodeURIComponent(message);
		}

		return url;
	}

	function openWhatsApp(message) {
		window.open(buildUrl(message), "_blank");
	}

	function bindWhatsAppLinks() {
		document.addEventListener("click", function (event) {
			var link = event.target.closest("a[href*='wa.me']");

			if (!link || link.getAttribute("data-whatsapp-skip") === "true") {
				return;
			}

			event.preventDefault();

			var href = link.getAttribute("href") || "";
			var text = "";
			var match = href.match(/[?&]text=([^&]+)/);

			if (match) {
				text = decodeURIComponent(match[1].replace(/\+/g, " "));
			}

			openWhatsApp(text);
		});
	}

	window.RenovaWhatsApp = {
		WHATSAPP_DEFAULT: WHATSAPP_NUMBER,
		WHATSAPP_GENERAL_BUSINESS: WHATSAPP_NUMBER,
		getPhoneNumber: getPhoneNumber,
		buildUrl: buildUrl,
		open: openWhatsApp
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bindWhatsAppLinks);
	} else {
		bindWhatsAppLinks();
	}
})(window);
