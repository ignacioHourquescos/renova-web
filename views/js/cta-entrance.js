/**
 * Entrada mínima (fade + 10px) de los botones de acción principal
 * cuando entran en pantalla. Una sola vez. Si este script no corre,
 * los botones siguen visibles: no hay opacity:0 en el CSS de base.
 * El botón del hero entra por CSS (ya está en pantalla al cargar).
 */
(function (window) {
	"use strict";

	if (window.__renovaCtaEntrance) return;
	window.__renovaCtaEntrance = true;

	var SELECTOR = [
		"a.atencion__cta",
		"a.libre__cta",
		"a.presentaciones__cta",
		".page-cta .hero__cta",
		"a.services-button",
		"a#whatsapp-contact-btn",
		"a.btn-whatsapp"
	].join(",");

	var SHIFT = "translateY(10px)";

	function reduced(win) {
		return !!(win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches);
	}

	function eligible(el) {
		if (!el || el.nodeType !== 1) return false;
		if (el.closest && (el.closest(".faq-link") || el.closest(".hero") || el.closest(".wa-float"))) return false;
		return true;
	}

	function clearHold(el) {
		if (el.getAttribute("data-cta-held") !== "1") return;
		el.removeAttribute("data-cta-held");
		if (el.style.opacity === "0") el.style.opacity = "";
		if (el.style.transform === SHIFT) el.style.transform = "";
	}

	function hold(el) {
		el.setAttribute("data-cta-held", "1");
		el.style.opacity = "0";
		el.style.transform = SHIFT;
	}

	function play(win, el) {
		if (el.getAttribute("data-cta-enter") === "1") return;
		el.setAttribute("data-cta-enter", "1");
		if (reduced(win) || typeof el.animate !== "function") {
			clearHold(el);
			return;
		}
		try {
			el.animate(
				[
					{ opacity: 0, transform: SHIFT },
					{ opacity: 1, transform: "none" }
				],
				{ duration: 450, easing: "ease-out", fill: "none" }
			);
		} catch (err) {}
		clearHold(el);
	}

	function inView(win, el) {
		var rect = el.getBoundingClientRect();
		var vh = win.innerHeight || 0;
		var vw = win.innerWidth || 0;
		if (rect.width < 1 || rect.height < 1 || vh < 1 || vw < 1) return false;
		return rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
	}

	function init(doc) {
		if (!doc || !doc.documentElement || !doc.body) return;
		if (doc.documentElement.getAttribute("data-cta-entrance") === "1") return;
		doc.documentElement.setAttribute("data-cta-entrance", "1");

		var win = doc.defaultView || window;
		if (reduced(win) || typeof win.IntersectionObserver !== "function") return;

		var io = new win.IntersectionObserver(function (entries) {
			for (var i = 0; i < entries.length; i++) {
				if (!entries[i].isIntersecting) continue;
				io.unobserve(entries[i].target);
				play(win, entries[i].target);
			}
		}, { threshold: 0 });

		function scan() {
			var nodes = doc.querySelectorAll(SELECTOR);
			for (var i = 0; i < nodes.length; i++) {
				var el = nodes[i];
				if (!eligible(el)) continue;
				if (el.getAttribute("data-cta-enter") === "1" || el.getAttribute("data-cta-armed") === "1") continue;
				el.setAttribute("data-cta-armed", "1");
				if (inView(win, el)) play(win, el);
				else {
					hold(el);
					io.observe(el);
				}
			}
		}

		function drop(node) {
			if (!node || node.nodeType !== 1) return;
			if (node.matches && node.matches(SELECTOR)) io.unobserve(node);
			if (!node.querySelectorAll) return;
			var inner = node.querySelectorAll(SELECTOR);
			for (var i = 0; i < inner.length; i++) io.unobserve(inner[i]);
		}

		scan();

		if (typeof win.MutationObserver === "function") {
			var mo = new win.MutationObserver(function (records) {
				for (var r = 0; r < records.length; r++) {
					var removed = records[r].removedNodes;
					for (var n = 0; n < removed.length; n++) drop(removed[n]);
				}
				scan();
			});
			mo.observe(doc.body, { childList: true, subtree: true });
		}

		if (win.matchMedia) {
			var media = win.matchMedia("(prefers-reduced-motion: reduce)");
			var reveal = function () {
				if (!media.matches) return;
				var held = doc.querySelectorAll("[data-cta-held='1']");
				for (var i = 0; i < held.length; i++) {
					held[i].setAttribute("data-cta-enter", "1");
					clearHold(held[i]);
					if (held[i].getAnimations) {
						held[i].getAnimations().forEach(function (anim) { anim.cancel(); });
					}
				}
			};
			if (media.addEventListener) media.addEventListener("change", reveal);
			else if (media.addListener) media.addListener(reveal);
		}
	}

	window.RenovaCtaEntrance = { init: init };

	if (document.body) init(document);
	else document.addEventListener("DOMContentLoaded", function () { init(document); });
})(window);
