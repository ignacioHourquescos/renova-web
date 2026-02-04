//WHATSAPP FUNCTION
$(function () {
	// Only initialize if the WhatsApp button exists (e.g., on index.html)
	if ($("#customWhatsAppBtn").length === 0) {
		return;
	}

	// Phone number (same for all sections)
	const phoneNumber = "5491141674140";
	
	// Store selected category (outside modal creation to persist)
	let selectedCategory = null;
	
	// Category labels
	const categoryLabels = {
		talleresLubricentros: "TENGO TALLER / LUBRICENTRO",
		empresaLogistica: "EMPRESA / LOGISTICA",
		agroIndustria: "AGRO / INDUSTRIA",
		abrirLubricentro: "QUIERO ABRIR UN LUBRICENTRO",
		otro: "OTRO"
	};

	// Location labels for messages
	const locationLabels = {
		capitalFederal: "Capital Federal",
		amba: "AMBA",
		interior: "el interior"
	};

	// Category messages with proper format
	const categoryMessages = {
		talleresLubricentros: { prefix: "Hola, tengo", text: "un taller/lubricentro", ubicado: "ubicado" },
		empresaLogistica: { prefix: "Hola, soy", text: "una empresa/logística", ubicado: "ubicada" },
		agroIndustria: { prefix: "Hola, soy", text: "una empresa de agro/industria", ubicado: "ubicada" },
		abrirLubricentro: { prefix: "Hola, quiero abrir", text: "un lubricentro", ubicado: "ubicado" },
		otro: { prefix: "Hola, soy", text: "otro tipo de cliente", ubicado: "ubicado" }
	};

	// Function to build WhatsApp message
	function buildMessage(category, location) {
		const locationLabel = locationLabels[location] || location;
		
		// Special case for "otro" - only show location
		if (category === "otro") {
			return `Hola, estoy ubicado en ${locationLabel}.\nTe escribo desde la web.`;
		}
		
		const categoryInfo = categoryMessages[category] || { prefix: "Hola, soy", text: category, ubicado: "ubicado" };
		
		return `${categoryInfo.prefix} ${categoryInfo.text} ${categoryInfo.ubicado} en ${locationLabel}.\nTe escribo desde la web.`;
	}

	// Function to reset modal to category tab
	function resetModal() {
		$("#tab-category").show().addClass("active");
		$("#tab-location").hide().removeClass("active");
		$(".modal-tab[data-tab='category']").addClass("active");
		$(".modal-tab[data-tab='location']").removeClass("active");
		selectedCategory = null;
	}

	// Create modal HTML if it doesn't exist yet
	if ($("#whatsappSectionModal").length === 0) {
		$("body").append(`
			<div class="modal fade" id="whatsappSectionModal" tabindex="-1" role="dialog" aria-labelledby="whatsappSectionModalLabel" aria-hidden="true">
				<div class="modal-dialog" role="document">
					<div class="modal-content">
						<div class="modal-body">
							<button type="button" class="close-modal-btn" data-dismiss="modal" aria-label="Close">
								<span aria-hidden="true">&times;</span>
							</button>
							
							<!-- Tabs -->
							<div class="modal-tabs">
								<button type="button" class="modal-tab active" data-tab="category"><span class="tab-number">1</span> CATEGORIA</button>
								<button type="button" class="modal-tab" data-tab="location"><span class="tab-number">2</span> UBICACION</button>
							</div>
							
							<!-- Tab Content: Category Selection -->
							<div class="modal-tab-content active" id="tab-category">
								<div class="section-buttons">
									<button type="button" class="section-btn" data-category="talleresLubricentros">TENGO TALLER / LUBRICENTRO</button>
									<button type="button" class="section-btn" data-category="empresaLogistica">EMPRESA / LOGISTICA</button>
									<button type="button" class="section-btn" data-category="agroIndustria">AGRO / INDUSTRIA</button>
									<button type="button" class="section-btn" data-category="abrirLubricentro">QUIERO ABRIR UN LUBRICENTRO</button>
									<button type="button" class="section-btn" data-category="otro">OTRO</button>
								</div>
							</div>

							<!-- Tab Content: Location Selection -->
							<div class="modal-tab-content" id="tab-location" style="display: none;">
								<div class="section-buttons">
									<button type="button" class="location-btn" data-location="capitalFederal">Capital Federal</button>
									<button type="button" class="location-btn" data-location="amba">AMBA</button>
									<button type="button" class="location-btn" data-location="interior">Interior</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`);

		// Handle tab switching
		$("#whatsappSectionModal").on("click", ".modal-tab", function () {
			const tabName = $(this).data("tab");
			
			// Update tabs
			$(".modal-tab").removeClass("active");
			$(this).addClass("active");
			
			// Update tab content
			$(".modal-tab-content").hide().removeClass("active");
			$("#tab-" + tabName).show().addClass("active");
		});

		// Handle category selection
		$("#whatsappSectionModal").on("click", ".section-btn[data-category]", function () {
			selectedCategory = $(this).data("category");
			
			// Switch to location tab
			$(".modal-tab").removeClass("active");
			$(".modal-tab[data-tab='location']").addClass("active");
			
			$(".modal-tab-content").hide().removeClass("active");
			$("#tab-location").show().addClass("active");
		});

		// Reset modal when closed
		$("#whatsappSectionModal").on("hidden.bs.modal", function () {
			resetModal();
		});

		// Handle location selection (Step 2)
		$("#whatsappSectionModal").on("click", ".location-btn", function () {
			const selectedLocation = $(this).data("location");
			
			if (selectedCategory && selectedLocation) {
				// Build message with category and location
				const message = buildMessage(selectedCategory, selectedLocation);
				
				// Encode message for URL
				const encodedMessage = encodeURIComponent(message);

				// Close the modal
				$("#whatsappSectionModal").modal("hide");

				// Open WhatsApp with the selected phone number and message
				const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
				window.open(whatsappURL);
			}
		});
	}

	// Set up custom WhatsApp button click handler
	$("#customWhatsAppBtn").on("click", function () {
		// Track the click event if the tracking function exists
		if (typeof gtag_report_conversion3 === "function") {
			gtag_report_conversion3();
		}

		// Show the modal with section options
		$("#whatsappSectionModal").modal("show");
		
		// Force backdrop to cover full screen
		setTimeout(function() {
			const backdrop = $(".modal-backdrop");
			if (backdrop.length > 0) {
				backdrop.css({
					position: "fixed",
					top: "0",
					left: "0",
					right: "0",
					bottom: "0",
					width: "100vw",
					height: "100vh",
					margin: "0",
					padding: "0",
					border: "none"
				});
			}
		}, 10);
		
		return false;
	});

	// Also handle when modal is shown via Bootstrap events
	$("#whatsappSectionModal").on("shown.bs.modal", function() {
		// Reset to step 1 when modal is shown
		resetModal();
		
		const backdrop = $(".modal-backdrop");
		if (backdrop.length > 0) {
			backdrop.css({
				position: "fixed",
				top: "0",
				left: "0",
				right: "0",
				bottom: "0",
				width: "100vw",
				height: "100vh",
				margin: "0",
				padding: "0",
				border: "none"
			});
		}
	});
});
