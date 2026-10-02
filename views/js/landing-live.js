/**
 * Lee la landing en Firestore (renova-landing) y actualiza los textos publicados.
 */
(function () {
	"use strict";

	var config = window.__LANDING_FIREBASE_CONFIG__;
	if (!config || !config.apiKey || !config.projectId) return;

	var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
	var SECTIONS = {
		hero: ".hero",
		marcas: ".site-brands",
		diferencial: ".diferencial",
		cotizar: ".cotizar",
		destacados: ".destacados",
		clients: ".site-clients",
		formulario: ".formulario",
		map: ".site-map",
		faq: ".faq",
		footer: ".site-footer"
	};

	function pageSlug() {
		var parts = window.location.pathname.split("/").filter(Boolean);
		var last = parts[parts.length - 1] || "";
		if (last === "index.html") last = parts[parts.length - 2] || "";
		return SLUG.test(last) ? last : "";
	}

	function decodeValue(value) {
		if (!value || typeof value !== "object") return null;
		if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
		if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) return value.booleanValue;
		if (Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue);
		if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) return value.doubleValue;
		if (Object.prototype.hasOwnProperty.call(value, "nullValue")) return null;
		if (Object.prototype.hasOwnProperty.call(value, "arrayValue")) {
			var values = value.arrayValue && value.arrayValue.values;
			return Array.isArray(values) ? values.map(decodeValue) : [];
		}
		if (Object.prototype.hasOwnProperty.call(value, "mapValue")) {
			return decodeFields(value.mapValue && value.mapValue.fields);
		}
		return null;
	}

	function decodeFields(fields) {
		var data = {};
		Object.keys(fields || {}).forEach(function (key) {
			data[key] = decodeValue(fields[key]);
		});
		return data;
	}

	function loadDoc(docPath) {
		var url = "https://firestore.googleapis.com/v1/projects/" + config.projectId
			+ "/databases/(default)/documents/" + docPath
			+ "?key=" + encodeURIComponent(config.apiKey);
		return fetch(url).then(function (response) {
			if (response.status === 404) return null;
			if (!response.ok) throw new Error("firestore");
			return response.json();
		}).then(function (data) {
			if (!data || !data.fields) return null;
			return decodeFields(data.fields);
		});
	}

	function safeHref(value) {
		var text = String(value || "").trim();
		if (!text) return "";
		if (text.charAt(0) === "/" && text.charAt(1) !== "/") return text;
		if (/^#[A-Za-z0-9_-]+$/.test(text)) return text;
		if (/^(https?:|mailto:|tel:)/i.test(text)) return text;
		return "";
	}

	function ensureStyle() {
		if (document.getElementById("landing-cloud-style")) return;
		var style = document.createElement("style");
		style.id = "landing-cloud-style";
		style.textContent = "[data-cloud-hidden]{display:none !important}";
		document.head.appendChild(style);
	}

	function applySections(sections) {
		if (!sections) return;
		ensureStyle();
		Object.keys(SECTIONS).forEach(function (id) {
			if (typeof sections[id] !== "boolean") return;
			document.querySelectorAll(SECTIONS[id]).forEach(function (node) {
				if (sections[id]) node.removeAttribute("data-cloud-hidden");
				else node.setAttribute("data-cloud-hidden", "");
			});
		});
	}

	function repoImage(relative) {
		var text = String(relative || "");
		var hero = /^images\/[a-z0-9]+(?:-[a-z0-9]+)*\.(jpg|png|webp)$/;
		var custom = /^images\/destacados\/[a-z0-9]+(?:-[a-z0-9]+)*\/c-[a-z0-9]{4,24}\.(jpg|png|webp)$/;
		if (!hero.test(text) && !custom.test(text)) return "";
		return "/" + text.replace(/^images\//, "assets/");
	}

	function applyHero(hero) {
		if (!hero) return;
		var image = repoImage(hero.backgroundImage);
		var heroNode = document.querySelector(".hero");
		if (image && heroNode) {
			heroNode.style.backgroundImage = "linear-gradient(var(--color-overlay), var(--color-overlay)), url(\"" + image + "\")";
		}
		var content = document.querySelector(".hero__content");
		if (!content) return;
		var heading = content.querySelector("h1");
		if (heading && typeof hero.heading === "string") heading.textContent = hero.heading;
		var eyebrow = content.querySelector(".hero__eyebrow");
		if (hero.eyebrow) {
			if (!eyebrow) {
				eyebrow = document.createElement("p");
				eyebrow.className = "hero__eyebrow";
				content.insertBefore(eyebrow, heading);
			}
			eyebrow.textContent = hero.eyebrow;
		} else if (eyebrow) {
			eyebrow.remove();
		}
		var subhead = content.querySelector(".hero__subhead");
		if (hero.subhead) {
			if (!subhead) {
				subhead = document.createElement("p");
				subhead.className = "hero__subhead";
				if (heading && heading.nextSibling) content.insertBefore(subhead, heading.nextSibling);
				else content.appendChild(subhead);
			}
			subhead.textContent = hero.subhead;
		} else if (subhead) {
			subhead.remove();
		}
		var href = safeHref(hero.ctaHref);
		if (typeof hero.ctaLabel === "string" || href) {
			document.querySelectorAll(".hero__cta").forEach(function (node) {
				if (typeof hero.ctaLabel === "string") node.textContent = hero.ctaLabel;
				if (node.tagName === "A" && href) node.setAttribute("href", href);
			});
		}
		if (hero.heading) {
			var brand = document.querySelector(".site-footer__brand");
			document.title = hero.heading + (brand && brand.textContent ? " | " + brand.textContent : "");
		}
		var meta = document.querySelector('meta[name="description"]');
		if (meta && hero.subhead) meta.setAttribute("content", hero.subhead);
	}

	function applyCustomImages(items) {
		if (!Array.isArray(items)) return;
		items.forEach(function (item) {
			if (!item || item.source !== "custom") return;
			var image = repoImage(item.image);
			var id = String(item.id || "");
			if (!image || !/^c-[a-z0-9]{4,24}$/.test(id)) return;
			document.querySelectorAll("img").forEach(function (node) {
				var src = node.getAttribute("src") || "";
				if (src.indexOf(id + ".") === -1) return;
				node.setAttribute("src", image);
			});
		});
	}

	function applyFaq(items, visible) {
		var section = document.querySelector(".faq");
		if (visible === false) {
			if (section) section.setAttribute("data-cloud-hidden", "");
			return;
		}
		var list = (Array.isArray(items) ? items : []).filter(function (item) {
			return item && String(item.question || "").trim() && String(item.answer || "").trim();
		});
		if (!list.length) return;
		ensureStyle();
		if (!section) {
			section = document.createElement("section");
			section.className = "faq";
			section.setAttribute("aria-labelledby", "faq-title");
			var inner = document.createElement("div");
			inner.className = "faq__inner";
			var title = document.createElement("h2");
			title.id = "faq-title";
			title.textContent = "Preguntas frecuentes";
			inner.appendChild(title);
			section.appendChild(inner);
			var footer = document.querySelector(".site-footer");
			if (footer && footer.parentNode) footer.parentNode.insertBefore(section, footer);
			else document.body.appendChild(section);
		}
		section.removeAttribute("data-cloud-hidden");
		var box = document.createElement("div");
		box.className = "faq__list";
		list.forEach(function (item) {
			var details = document.createElement("details");
			details.className = "faq__item";
			var summary = document.createElement("summary");
			summary.textContent = String(item.question).trim();
			var answer = document.createElement("p");
			answer.textContent = String(item.answer).trim();
			details.appendChild(summary);
			details.appendChild(answer);
			box.appendChild(details);
		});
		var current = section.querySelector(".faq__list");
		if (current) current.replaceWith(box);
		else (section.querySelector(".faq__inner") || section).appendChild(box);
		var empty = section.querySelector(".faq__empty");
		if (empty) empty.remove();
	}

	function applyFooter(site) {
		var footer = site && site.footer;
		if (!footer) return;
		var root = document.querySelector(".site-footer");
		if (root) {
			var brand = root.querySelector(".site-footer__brand");
			if (brand && site.brand) brand.textContent = site.brand;
			var legal = [footer.legalName, footer.taxId ? "CUIT " + footer.taxId : ""].filter(Boolean).join(" · ");
			var plain = [];
			Array.prototype.forEach.call(root.children, function (node) {
				if (node.tagName !== "P") return;
				if (node.classList.contains("site-footer__brand") || node.classList.contains("site-footer__qr") || node.classList.contains("site-footer__legal")) return;
				plain.push(node);
			});
			var legalSet = false;
			plain.forEach(function (node) {
				var link = node.querySelector("a");
				if (link && footer.privacyLabel) {
					link.textContent = footer.privacyLabel;
					var privacyHref = safeHref(footer.privacyHref);
					if (privacyHref) link.setAttribute("href", privacyHref);
					return;
				}
				if (!legalSet && legal) {
					node.textContent = legal;
					legalSet = true;
					return;
				}
				if (footer.address) node.textContent = footer.address;
			});
			var copy = root.querySelector(".site-footer__legal");
			if (copy && footer.copyright) copy.textContent = footer.copyright;
			var privacy = root.querySelector(".site-footer__privacy p");
			if (privacy && footer.privacyText) privacy.textContent = footer.privacyText;
		}
		var place = String(footer.address || "").trim();
		if (place) {
			var mapCopy = document.querySelector(".site-map__copy p");
			if (mapCopy) mapCopy.textContent = place;
			var query = encodeURIComponent(place);
			var mapLink = document.querySelector(".site-map__copy a");
			if (mapLink) mapLink.setAttribute("href", "https://www.google.com/maps/search/?api=1&query=" + query);
			var frame = document.querySelector(".site-map iframe");
			if (frame) {
				frame.setAttribute("src", "https://maps.google.com/maps?q=" + query + "&z=16&hl=es&output=embed");
				frame.setAttribute("title", "Mapa de " + place);
			}
			var pin = document.querySelector('.quick-access a[data-label="Ubicación"]');
			if (pin) pin.setAttribute("href", "https://www.google.com/maps/search/?api=1&query=" + query);
		}
		var whatsapp = safeHref(footer.whatsappHref);
		if (whatsapp) {
			document.querySelectorAll(".wa-float, .quick-access__wa").forEach(function (node) {
				node.setAttribute("href", whatsapp);
			});
		}
	}

	var slug = pageSlug();
	if (!slug) return;

	Promise.all([
		loadDoc("landings/" + slug).catch(function () { return null; }),
		loadDoc("site/renova").catch(function () { return null; })
	]).then(function (docs) {
		var landing = docs[0];
		var site = docs[1];
		if (!landing && !site) return;
		if (landing) {
			applySections(landing.sections);
			applyHero(landing.hero);
			applyCustomImages(landing.destacados);
			applyFaq(landing.faq, landing.sections && landing.sections.faq);
		}
		applyFooter(site);
		document.documentElement.setAttribute("data-landing-cloud", slug);
	}).catch(function () {});
})();
