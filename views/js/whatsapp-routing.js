(function (window) {
	"use strict";

	var WHATSAPP_DEFAULT = "5491141674140";
	var WHATSAPP_GENERAL_BUSINESS = "5491140565047";
	var TIMEZONE = "America/Argentina/Buenos_Aires";
	var BUSINESS_DAYS = [1, 2, 3, 4, 5];
	var BUSINESS_START_HOUR = 8;
	var BUSINESS_END_HOUR = 17;

	function getArgentinaDate(date) {
		return new Date(date.toLocaleString("en-US", { timeZone: TIMEZONE }));
	}

	function isBusinessHours(date) {
		var localDate = getArgentinaDate(date || new Date());
		var day = localDate.getDay();
		var hour = localDate.getHours();

		if (BUSINESS_DAYS.indexOf(day) === -1) {
			return false;
		}

		return hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR;
	}

	function getPhoneNumber(intent) {
		if (!isBusinessHours()) {
			return WHATSAPP_DEFAULT;
		}

		if (intent === "abrirLubricentro") {
			return WHATSAPP_DEFAULT;
		}

		return WHATSAPP_GENERAL_BUSINESS;
	}

	function buildUrl(message, intent) {
		var phoneNumber = getPhoneNumber(intent || "general");
		var url = "https://wa.me/" + phoneNumber;

		if (message) {
			url += "?text=" + encodeURIComponent(message);
		}

		return url;
	}

	function openWhatsApp(message, intent) {
		window.open(buildUrl(message, intent || "general"), "_blank");
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

			var intent = link.getAttribute("data-whatsapp-intent") || "general";
			openWhatsApp(text, intent);
		});
	}

	window.RenovaWhatsApp = {
		WHATSAPP_DEFAULT: WHATSAPP_DEFAULT,
		WHATSAPP_GENERAL_BUSINESS: WHATSAPP_GENERAL_BUSINESS,
		isBusinessHours: isBusinessHours,
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
