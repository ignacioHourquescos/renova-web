/**
 * Lee la landing en Firestore (renova-landing) y actualiza los textos publicados.
 */
(function () {
	"use strict";

	function armMaps() {
		var docs = [];
		document.querySelectorAll(".site-map__canvas").forEach(function (canvas) {
			if (canvas.getAttribute("data-map-armed") === "1") return;
			canvas.setAttribute("data-map-armed", "1");
			var frame = canvas.querySelector("iframe");
			if (frame && frame.getAttribute("loading") === "lazy") {
				frame.setAttribute("loading", "eager");
				var src = frame.getAttribute("src");
				if (src) frame.setAttribute("src", src);
			}
			canvas.addEventListener("click", function () {
				canvas.classList.add("is-live");
			});
			var doc = canvas.ownerDocument;
			if (docs.indexOf(doc) === -1) docs.push(doc);
		});
		docs.forEach(function (doc) {
			doc.addEventListener("mousemove", function (event) {
				doc.querySelectorAll(".site-map__canvas.is-live").forEach(function (canvas) {
					var rect = canvas.getBoundingClientRect();
					var x = event.clientX;
					var y = event.clientY;
					if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
						canvas.classList.remove("is-live");
					}
				});
			});
		});
	}

	armMaps();

	var config = window.__LANDING_FIREBASE_CONFIG__;
	if (!config || !config.apiKey || !config.projectId) return;

	var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
	var SECTIONS = {
		hero: ".hero",
		libre: ".libre",
		chips: ".pedidos",
		tabla: ".presentaciones",
		marcas: ".site-brands",
		diferencial: ".diferencial",
		publico: ".publico",
		cotizar: ".cotizar",
		destacados: ".destacados",
		atencion: ".atencion",
		clients: ".site-clients",
		formulario: ".formulario",
		zonas: ".zonas",
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

	function withYearsMark(value) {
		return String(value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/(\+?\s*40\s*años)/gi, function (raw) {
				var lead = raw.match(/^\s*/)[0];
				return lead + '<strong class="years-mark">' + raw.slice(lead.length) + '</strong>';
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
			eyebrow.innerHTML = withYearsMark(hero.eyebrow);
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
			subhead.innerHTML = withYearsMark(hero.subhead);
		} else if (subhead) {
			subhead.remove();
		}
		var href = safeHref(hero.ctaHref);
		if (typeof hero.ctaLabel === "string" || href) {
			document.querySelectorAll(".hero__cta").forEach(function (node) {
				if (node.closest && node.closest(".faq-link")) return;
				if (typeof hero.ctaLabel === "string") node.textContent = hero.ctaLabel;
				if (node.tagName === "A" && href) node.setAttribute("href", href);
			});
		}
		applyResponseNote(hero, content);
		if (hero.heading) {
			var brand = document.querySelector(".site-footer__brand");
			document.title = hero.heading + (brand && brand.textContent ? " | " + brand.textContent : "");
		}
		var meta = document.querySelector('meta[name="description"]');
		if (meta && hero.subhead) meta.setAttribute("content", hero.subhead);
	}

	var RESPONSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.8"></circle><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

	function applyResponseNote(hero, content) {
		if (!hero || typeof hero.responseNote !== "string") return;
		var note = hero.responseNote.trim();
		var node = content.querySelector(".hero__response");
		var heroNode = content.closest ? content.closest(".hero") : null;
		if (!note) {
			if (node) node.remove();
			if (heroNode) heroNode.classList.remove("hero--with-note");
			return;
		}
		if (!node) {
			node = document.createElement("p");
			node.className = "hero__response";
			node.innerHTML = RESPONSE_ICON + "<span></span>";
			content.appendChild(node);
		}
		var label = node.querySelector("span");
		if (label) label.textContent = note;
		if (heroNode) heroNode.classList.add("hero--with-note");
	}

	function applyClientsCopy(extras) {
		var copy = extras && extras.clientsCopy;
		if (!copy || typeof copy !== "object") return;
		var heading = String(copy.heading || "").trim();
		var text = String(copy.text || "").trim();
		if (!heading && !text) return;
		var section = document.querySelector(".site-clients");
		if (!section) return;
		section.classList.add("site-clients--statement");
		var title = section.querySelector("#site-clients-title");
		if (title && heading) title.textContent = heading;
		if (!text) return;
		var lead = section.querySelector(".section-title__sub");
		if (!lead) {
			lead = document.createElement("p");
			lead.className = "section-title__sub";
			var wrap = section.querySelector(".section-title");
			if (wrap) wrap.appendChild(lead);
		}
		if (lead) lead.innerHTML = withYearsMark(text);
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
		var limit = section ? Number(section.getAttribute("data-limit")) : 0;
		if (limit > 0) list = list.slice(0, limit);
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

	function withPagePhone(href, digits) {
		var value = String(href || "");
		var url;
		try { url = new URL(value); } catch (error) { return ""; }
		var host = url.hostname.replace(/^www\./, "");
		if (host === "wa.me") {
			if (url.pathname.replace(/\D/g, "") === digits) return value;
			url.pathname = "/" + digits;
			return url.toString();
		}
		if (host === "api.whatsapp.com" || host === "web.whatsapp.com") {
			if ((url.searchParams.get("phone") || "").replace(/\D/g, "") === digits) return value;
			url.searchParams.set("phone", digits);
			return url.toString();
		}
		return "";
	}

	function withPageMessage(href, message) {
		var url;
		try { url = new URL(String(href || "")); } catch (error) { return ""; }
		var host = url.hostname.replace(/^www\./, "");
		if (host !== "wa.me" && host !== "api.whatsapp.com" && host !== "web.whatsapp.com") return "";
		var text = String(message || "").trim();
		if (text) url.searchParams.set("text", text);
		else url.searchParams.delete("text");
		return url.toString();
	}

	function applyPageWhatsapp(landing) {
		if (!landing) return;
		var digits = String(landing.whatsapp || "").replace(/\D/g, "");
		var hasMessage = Object.prototype.hasOwnProperty.call(landing, "whatsappMessage");
		var message = String(landing.whatsappMessage || "");
		if (digits.length < 8 && !hasMessage) return;
		document.querySelectorAll("a[href]").forEach(function (node) {
			var href = node.getAttribute("href");
			var next = href;
			if (digits.length >= 8) {
				var phoned = withPagePhone(href, digits);
				if (phoned) next = phoned;
			}
			if (hasMessage) {
				var messaged = withPageMessage(next, message);
				if (messaged) next = messaged;
			}
			if (next && next !== href) node.setAttribute("href", next);
		});
	}

	function telHref(phone) {
		var digits = String(phone || "").replace(/\D/g, "");
		if (digits.length < 8) return "";
		var local = digits.indexOf("54") === 0 ? digits : digits.replace(/^0/, "");
		return "tel:+" + (local.indexOf("54") === 0 ? local : "54" + local);
	}

	function applyPhone(root, footer) {
		var phone = String(footer.phone || "").trim();
		if (!phone) return;
		var node = root.querySelector(".site-footer__phone");
		if (!node) {
			node = document.createElement("p");
			node.className = "site-footer__phone";
			var privacy = null;
			Array.prototype.forEach.call(root.children, function (child) {
				if (privacy || child.tagName !== "P") return;
				if (child.classList.contains("site-footer__qr") || child.classList.contains("site-footer__brand") || child.classList.contains("site-footer__phone")) return;
				var link = child.querySelector("a");
				if (link && !/^tel:/i.test(link.getAttribute("href") || "")) privacy = child;
			});
			var legal = root.querySelector(".site-footer__legal");
			if (privacy) root.insertBefore(node, privacy);
			else if (legal) root.insertBefore(node, legal);
			else root.appendChild(node);
		}
		var href = telHref(phone);
		node.textContent = "";
		if (!href) {
			node.textContent = phone;
			return;
		}
		var link = document.createElement("a");
		link.setAttribute("href", href);
		link.textContent = phone;
		node.appendChild(link);
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
				if (node.classList.contains("site-footer__brand") || node.classList.contains("site-footer__qr") || node.classList.contains("site-footer__legal") || node.classList.contains("site-footer__phone")) return;
				plain.push(node);
			});
			var legalSet = false;
			plain.forEach(function (node) {
				var link = node.querySelector("a");
				if (link && /^tel:/i.test(link.getAttribute("href") || "")) return;
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
			applyPhone(root, footer);
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
				var nextSrc = "https://maps.google.com/maps?q=" + query + "&z=16&hl=es&output=embed";
				if (frame.getAttribute("src") !== nextSrc) frame.setAttribute("src", nextSrc);
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

	var STATS_COLLECTION = "landings_statistics_dev";

	function markStat(key) {
		try {
			if (localStorage.getItem(key)) return false;
			localStorage.setItem(key, "1");
			return true;
		} catch (e) {
			return false;
		}
	}

	function unmarkStat(key) {
		try {
			localStorage.removeItem(key);
		} catch (e) {}
	}

	function incrementStat(slug, field) {
		var key = "renova:" + slug + ":" + (field === "visits" ? "visit" : "wpp");
		if (!markStat(key)) return;
		var docName = "projects/" + config.projectId
			+ "/databases/(default)/documents/" + STATS_COLLECTION + "/" + slug;
		var url = "https://firestore.googleapis.com/v1/projects/" + config.projectId
			+ "/databases/(default)/documents:commit?key=" + encodeURIComponent(config.apiKey);
		fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			keepalive: true,
			body: JSON.stringify({
				writes: [{
					transform: {
						document: docName,
						fieldTransforms: [{
							fieldPath: field,
							increment: { integerValue: "1" }
						}]
					}
				}]
			})
		}).then(function (response) {
			if (!response.ok) throw new Error("stats");
		}).catch(function () {
			unmarkStat(key);
		});
	}

	function isWhatsappLink(node) {
		if (node && node.nodeType !== 1) node = node.parentElement;
		var link = node && node.closest ? node.closest("a") : null;
		if (!link) return false;
		if (link.closest && link.closest(".carousel")) return false;
		var href = link.getAttribute("href") || "";
		return /wa\.me|api\.whatsapp\.com/i.test(href);
	}

	function trackLanding(slug) {
		if (window.location.pathname.indexOf("/preview/") !== -1) return;
		incrementStat(slug, "visits");
		document.addEventListener("click", function (event) {
			if (!isWhatsappLink(event.target)) return;
			incrementStat(slug, "wppClicks");
		}, true);
	}

	function ensureWhatsappFloat() {
		document.querySelectorAll(".quick-access__wa").forEach(function (node) {
			node.remove();
		});
		if (document.querySelector(".wa-float")) return;
		var source = document.querySelector('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="web.whatsapp.com"]');
		var href = safeHref(source && source.getAttribute("href"));
		if (!href) return;
		var link = document.createElement("a");
		link.className = "wa-float";
		link.setAttribute("href", href);
		link.setAttribute("target", "_blank");
		link.setAttribute("rel", "noopener noreferrer");
		link.setAttribute("aria-label", "Escribir por WhatsApp");
		link.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.26.6 4.44 1.72 6.36L3.2 28.8l6.6-1.73a12.75 12.75 0 0 0 6.24 1.6h.01c7.07 0 12.8-5.73 12.8-12.8s-5.73-12.67-12.81-12.67zm0 23.42h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.02 1.06 1.07-3.9-.25-.4a10.6 10.6 0 0 1-1.63-5.67c0-5.86 4.77-10.62 10.64-10.62 2.84 0 5.51 1.11 7.52 3.12a10.55 10.55 0 0 1 3.11 7.51c0 5.86-4.77 10.61-10.64 10.61zm5.83-7.95c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.51-.16-.72.16-.21.32-.83 1.04-1.02 1.25-.19.21-.38.24-.7.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.87-1.76-2.19-.19-.32-.02-.49.14-.65.14-.14.32-.38.48-.56.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.53-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.67 0 1.57 1.15 3.08 1.31 3.3.16.21 2.26 3.45 5.47 4.84.76.33 1.36.53 1.82.67.77.24 1.46.21 2.02.13.62-.09 1.89-.77 2.16-1.51.27-.75.27-1.38.19-1.51-.08-.14-.29-.21-.61-.37z"/></svg>';
		document.body.appendChild(link);
	}

	document.querySelectorAll(".faq-link .hero__cta").forEach(function (node) {
		if (!node.parentNode) return;
		node.parentNode.replaceChild(node.cloneNode(true), node);
	});

	var slug = pageSlug();
	if (!slug) return;
	ensureWhatsappFloat();
	trackLanding(slug);

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
			applyClientsCopy(landing.extras);
			applyCustomImages(landing.destacados);
			applyFaq(landing.faq, landing.sections && landing.sections.faq);
		}
		applyFooter(site);
		applyPageWhatsapp(landing);
		document.documentElement.setAttribute("data-landing-cloud", slug);
	}).catch(function () {});
})();
