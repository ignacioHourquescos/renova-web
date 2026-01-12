//WHATSAPP FUNCTION
$(function () {
	// Only initialize if the WhatsApp button exists (e.g., on index.html)
	if ($("#customWhatsAppBtn").length === 0) {
		return;
	}

	// Phone number (same for all sections)
	const phoneNumber = "5491141674140";
	
	// Default messages for each section
	const defaultMessages = {
		transporte: "Hola, estoy interesado en filtros y lubricantes para mi flota de transporte",
		lubricentro: "Hola, necesito información sobre productos para mi lubricentro",
		agro: "Hola, busco filtros y lubricantes para maquinaria agrícola",
		industria: "Hola, queria  sobre filtros y lubricantes industriales",
		general: "Hola, me gustaría recibir más información sobre sus productos"
	};

	// Create modal HTML if it doesn't exist yet
	if ($("#whatsappSectionModal").length === 0) {
		$("body").append(`
			<div class="modal fade" id="whatsappSectionModal" tabindex="-1" role="dialog" aria-labelledby="whatsappSectionModalLabel" aria-hidden="true">
				<div class="modal-dialog" role="document">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="whatsappSectionModalLabel">¿En qué podemos ayudarte?</h5>
							<button type="button" class="close" data-dismiss="modal" aria-label="Close">
								<span aria-hidden="true">&times;</span>
							</button>
						</div>
						<div class="modal-body">
							<p>Selecciona el área en la que necesitas asesoramiento:</p>
							<div class="list-group">
								<button type="button" class="list-group-item list-group-item-action" data-section="transporte">Empresas de Transportes y Logística</button>
								<button type="button" class="list-group-item list-group-item-action" data-section="agro">AGRO</button>
								<button type="button" class="list-group-item list-group-item-action" data-section="industria">Industria</button>
								<button type="button" class="list-group-item list-group-item-action" data-section="lubricentro">Lubricentros</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		`);

		// Handle section selection
		$("#whatsappSectionModal .list-group-item").on("click", function () {
			const section = $(this).data("section");
			const message = defaultMessages[section] || defaultMessages.general;
			
			// Encode message for URL
			const encodedMessage = encodeURIComponent(message);

			// Close the modal
			$("#whatsappSectionModal").modal("hide");

			// Open WhatsApp with the selected phone number and default message
			const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
			window.open(whatsappURL);
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
		return false;
	});
});
