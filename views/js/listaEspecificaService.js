// Al finalizarse de cargar el DOM:
var server = "https://renovaapi-production.up.railway.app";

var id = getQueryParam("id");
var listCode = "";
try { listCode = localStorage.getItem("renova_listCode") || ""; } catch (e) {}

function normalizarResultado(data, id) {
	var resultado = data.resultado;
	if (resultado) {
		var idNum = parseInt(id, 10);
		if (window.matchMedia("(max-width: 400px)").matches) {
			for (var i = 0; i < resultado.length; i++) {
				var stock = convertirStockNumericoEnEscala(resultado[i].s);
				var precioConIva = (resultado[i].p * 1.21).toFixed(0);
				resultado[i].p = sacarDescuetnoTamboresyBaldes(idNum, resultado[i].id, precioConIva);
				resultado[i].s = "Stock: " + stock;
				resultado[i].pf = "Unitario Final x unid:\xa0\xa0\xa0$" + precioConIva;
			}
		} else {
			for (var j = 0; j < resultado.length; j++) {
				var stock2 = convertirStockNumericoEnEscala(resultado[j].s);
				var precioConIva2 = (resultado[j].p * 1.21).toFixed(0);
				resultado[j].p = sacarDescuetnoTamboresyBaldes2(idNum, resultado[j].id, precioConIva2);
				resultado[j].s = stock2;
				resultado[j].pf = "$" + precioConIva2;
			}
		}
		return { resultado: resultado, agrupacion: data.agrupacion, descuento: data.descuento };
	}
	// Formato listasDetalle2 (recordsets[0])
	var filas = data.recordsets && data.recordsets[0] ? data.recordsets[0] : [];
	var idNum = parseInt(id, 10);
	resultado = filas.map(function (row) {
		var p = row.precio != null ? row.precio : row.Precio || row.p;
		if (p == null) p = 0;
		var precioConIva = (parseFloat(p) * 1.21).toFixed(0);
		var idProd = row.id != null ? row.id : row.codigo || row.articulo || row.Articulo || row.Codigo || "";
		var desc = row.descripcion != null ? row.descripcion : row.Descripcion || (row.d != null ? row.d : "");
		var stock = row.stock != null ? row.stock : row.Stock || row.s;
		if (typeof stock === "number") stock = stock > 20 ? "Disponible" : "Consultar";
		var r = row.rubro != null ? row.rubro : row.Rubro || (row.r != null ? row.r : "");
		return {
			id: idProd,
			d: desc,
			p: "$" + precioConIva,
			s: stock,
			pf: "$" + precioConIva,
			r: r
		};
	});
	for (var k = 0; k < resultado.length; k++) {
		resultado[k].p = sacarDescuetnoTamboresyBaldes2(idNum, resultado[k].id, resultado[k].pf.replace("$", ""));
	}
	return { resultado: resultado, agrupacion: data.agrupacion || "Lista", descuento: data.descuento != null ? data.descuento : "" };
}

function pintarLista(info) {
	var resultado = info.resultado;

	resultado = resultado.filter(function (row) {
		return String(row.id || "").trim().toUpperCase().indexOf("KIT") !== 0;
	});

	$("table").bootstrapTable({ data: resultado });

	if (listCode === "0" || listCode === "1" || listCode === "3") {
		$('#myTable').bootstrapTable('hideColumn', 'p');
	}

	$(".spinner-border").remove();
	document.getElementById("nombreLista").innerHTML = "Lista de Precios";
	document.getElementById("descuento").innerHTML = info.descuento;
}

function obtenerListaEspecifica(id) {
	if (!id) {
		$(".spinner-border").remove();
		document.getElementById("nombreLista").innerHTML = "Lista no especificada";
		return;
	}
	// Probar primero endpoint de producción (listasDetalle2), luego formato con resultado
	$.getJSON(server + "/listasDetalle2/" + id, function (data) {
		var info = normalizarResultado(data, id);
		pintarLista(info);
	}).fail(function () {
		$.getJSON(server + "/listas/" + id + "?listCode=" + listCode, function (data) {
			var info = normalizarResultado(data, id);
			pintarLista(info);
		}).fail(function () {
			$(".spinner-border").remove();
			document.getElementById("nombreLista").innerHTML = "Error al cargar la lista";
			document.getElementById("descuento").innerHTML = "Intentá de nuevo más tarde.";
		});
	});
}

//escondo table header cuando es un celular, y si es en PC lo muestro
if (window.matchMedia("(max-width: 400px)").matches) {
	console.log("menos de 400px");
} else {
	console.log("mas de 400px");
	document.getElementById("myTable").removeAttribute("data-show-header");
}

//SACO TAMORE SY BALDES DEL DESCUTNO
function sacarDescuetnoTamboresyBaldes(id, data, precioConIva) {
	if (id == 1) {
		data = "";
		return data;
	} //Verifico que sea caja,tambor
	else if (
		id == 12 &&
		(data == "TAMBOR/6100/10W40" ||
			data == "TAMBOR/TEKMA/10W40" ||
			data == "TAMBOR/TEKMA/15W40" ||
			data == "BALDE/TEKMA/15W40")
	) {
		data = "Unitario Final x caja: -";
		return data;
	} else if (id == 3 && data.substring(0, 2) == "01") {
		data = "Unitario Final x caja: -";
		return data;
	} else if (
		id == 316 &&
		(data.substring(0, 6) == "TAMBOR" || data.substring(0, 5) == "BALDE")
	) {
		data = "Unitario Final x caja: -";
		return data;
	} else if (
		id == 5 &&
		(data.substring(0, 6) == "TAMBOR" || data.substring(0, 5) == "BALDE")
	) {
		data = "Unitario Final x caja: -";
		return data;
	} else if (id == 27 && (data.includes("205") || data.includes("20"))) {
		data = "Unitario Final x caja: -";
		return data;
	}
	// Hago el 10% de descuento en envases
	data = "Unitario Final x caja: $" + (precioConIva * 0.9).toFixed(0);
	return data;
}

function sacarDescuetnoTamboresyBaldes2(id, data, precioConIva) {
	if (id == 1) {
		data = "-";
		return data;
	} //Verifico que sea caja,tambor
	else if (
		id == 12 &&
		(data == "TAMBOR/6100/10W40" ||
			data == "TAMBOR/TEKMA/10W40" ||
			data == "TAMBOR/TEKMA/15W40" ||
			data == "BALDE/TEKMA/15W40")
	) {
		data = "-";
		return data;
	} else if (id == 3 && data.substring(0, 2) == "01") {
		data = "-";
		return data;
	} else if (
		id == 316 &&
		(data.substring(0, 6) == "TAMBOR" || data.substring(0, 5) == "BALDE")
	) {
		data = " -";
		return data;
	} else if (
		id == 5 &&
		(data.substring(0, 6) == "TAMBOR" || data.substring(0, 5) == "BALDE")
	) {
		data = " -";
		return data;
	} else if (id == 27 && (data.endsWith("205") || data.endsWith("20"))) {
		data = " -";
		return data;
	}
	// Hago el 10% de descuento en envases
	data = "$" + (precioConIva * 0.9).toFixed(0);
	return data;
}

//FUNCION CONVERTIR STOCK NUMERICO EN ALFABETICO
function convertirStockNumericoEnEscala(elemento) {
	if (elemento > 20) {
		return "Disponible";
	} else return "Consultar";
}

//DISPARO FUNCION PRINICPAL
obtenerListaEspecifica(id);

// $( document ).ready(function() {
//     document.getElementsByClassName("search-input").placeholder="Buscar por Codigo";
// });

// (function() {
// 	document.getElementsByClassName("form-control search-input")[0].style.placeholder="Buscar";
//  })();

//  $(document).ready(function () {
// 	$('#myTable').DataTable({"order": [[ 0, "asc" ]]});
// 	$('#nombreLista').attr('color', 'red');
// 	$('.dataTables_length').addClass('bs-select');
// 	$('input').attr('placeholder', 'Buscar');
// 	console.log("hola");
// });

$(document).ready(function () {
	console.log("ready!");
	console.log("hola");
	$("#nombreLista").attr("style", "color:red");
	$("#myTable").DataTable({ order: [[1, "asc"]] });
	$(".dataTables_length").addClass("bs-select");
	$("input").attr("placeholder", "Buscar");
});
