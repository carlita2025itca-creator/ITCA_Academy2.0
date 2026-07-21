import { db } from './firebase-config.js';
// 1. CAMBIO: Importaciones de Realtime Database
import { ref, get, child, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { registrarAccion } from './historial.js';

// 1. CARGAR LISTADO DE CERTIFICADOS
// 1. CARGAR LISTADO DE CERTIFICADOS
export async function cargarTablaCertificados() {
    const tableBody = document.getElementById('cert-table-body');
    if (!tableBody) return;

    // 1. Capturamos la fecha seleccionada en el calendario
    const filtroFechaInput = document.getElementById('filter-cert-date');
    const fechaSeleccionada = filtroFechaInput ? filtroFechaInput.value : ''; 
    
    const filtroModulo = document.getElementById('filter-cert-module') ? document.getElementById('filter-cert-module').value : 'todos';

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Buscando registros...</td></tr>';

    try {
        // CORRECCIÓN 1: Leemos la tabla correcta donde Unity guarda los datos
        const snapshot = await get(child(ref(db), "resultados_evaluaciones"));
        
        // CORRECCIÓN 2: Traemos Usuarios y Módulos para cruzar los datos y mostrar nombres reales
        const usuariosSnap = await get(child(ref(db), "Usuarios"));
        const usuariosDB = usuariosSnap.exists() ? usuariosSnap.val() : {};

        const modulosSnap = await get(child(ref(db), "modulos"));
        const modulosDB = modulosSnap.exists() ? modulosSnap.val() : {};

        tableBody.innerHTML = '';
        
        let contadorMostrados = 0;
        let resultadosArray = [];

        if (snapshot.exists()) {
            snapshot.forEach(docSnap => {
                resultadosArray.push({ id: docSnap.key, ...docSnap.val() });
            });
        }

        // Ordenamos los resultados del más reciente al más antiguo
        resultadosArray.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

        resultadosArray.forEach(data => {
            const id = data.id;
            
            // Adaptamos las variables a como las guarda Unity
            const idUsuario = data.usuarioId || data.cedula; 
            const idModulo = data.moduloId;
            
            // Buscamos los datos reales en nuestras bases de datos cruzadas
            const infoUsuario = usuariosDB[idUsuario] || {};
            const infoModulo = modulosDB[idModulo] || {};

            const nombreEstudiante = infoUsuario.nombre || infoUsuario.nombres || "Estudiante";
            const apellidoEstudiante = infoUsuario.apellido || infoUsuario.apellidos || "";
            const correoEstudiante = infoUsuario.correo || infoUsuario.Correo || "Sin correo";
            const nombreModuloReal = infoModulo.nombre || infoModulo.Nombre || "Módulo Desconocido";
            
            // Convertir Fecha 
            const fechaJS = new Date(data.fecha || Date.now());
            const anio = fechaJS.getFullYear();
            const mes = String(fechaJS.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaJS.getDate()).padStart(2, '0');
            const fechaDocFormateada = `${anio}-${mes}-${dia}`;

            let mostrar = true;

            // FILTRO DE CALENDARIO
            if (fechaSeleccionada && fechaDocFormateada !== fechaSeleccionada) {
                mostrar = false;
            }
            
            // FILTRO DE MÓDULO
            if (filtroModulo !== 'todos' && idModulo !== filtroModulo) {
                mostrar = false;
            }

            if (mostrar) {
                contadorMostrados++;

                const notaNumerica = parseFloat(data.nota || 0);
                const notaColor = notaNumerica >= 7 ? '#166534' : '#ef4444';
                const notaBg = notaNumerica >= 7 ? '#dcfce7' : '#fef2f2';

                tableBody.innerHTML += `
                    <tr>
                        <td><div style="font-weight: 600;">${nombreEstudiante} ${apellidoEstudiante}</div></td>
                        <td>
                            <div style="font-size: 0.85rem; color: #1e293b;">ID: ${idUsuario}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">${correoEstudiante}</div>
                        </td>
                        <td>
                            <div style="font-size: 0.85rem; font-weight: 600; color: #004899;">${idModulo}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">${nombreModuloReal}</div>
                        </td>
                        <td>
                            <span style="background: ${notaBg}; color: ${notaColor}; padding: 4px 10px; border-radius: 12px; font-weight: bold;">
                                ${notaNumerica.toFixed(2)}/10
                            </span>
                        </td>
                        <td style="text-align: right;">
                            <div class="dropdown-container">
                                <button class="btn-opciones-main" onclick="toggleOpcionesModulo('drop-cert-${id}')">
                                    Opciones <i class="fas fa-chevron-down"></i>
                                </button>
                                <div id="drop-cert-${id}" class="dropdown-menu">
                                    <a href="#" onclick="verDetallesEvaluacion('${id}')">
                                        <i class="fas fa-search-plus"></i> Ver Detalles
                                    </a>
                                    <a href="#" onclick="generarCertificadoPDF('${id}')" style="color: #004899;">
                                        <i class="fas fa-file-pdf"></i> Generar Certificado
                                    </a>
                                    <a href="#" onclick="eliminarResultado('${id}', '${nombreEstudiante}')" class="action-danger">
                                        <i class="fas fa-trash"></i> Eliminar
                                    </a>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }
        });

        const counter = document.getElementById('cert-global-counter');
        if (counter) counter.innerText = `Mostrando: ${contadorMostrados}`;

        if (contadorMostrados === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">No hay resultados para los filtros seleccionados.</td></tr>';
        }

    } catch (error) {
        console.error("Error al cargar certificados:", error);
    }
}
// 2. ELIMINAR RESULTADO
window.eliminarResultado = async (id, nombre) => {
    if(confirm(`¿Estás segura de eliminar el registro de ${nombre}?`)) {
        try {
            // AQUÍ: Cambiamos "resultados" por "resultados_evaluaciones"
            await remove(ref(db, `resultados_evaluaciones/${id}`));
            registrarAccion('ELIMINAR', 'Certificados', `Eliminó resultado de: ${nombre}`);
            cargarTablaCertificados();
        } catch (e) {
            console.error("Error al eliminar:", e);
        }
    }
};

// 3. VER DETALLES
window.verDetallesEvaluacion = (id) => {
    const modal = document.getElementById('modal-cert-details');
    const content = document.getElementById('detalles-evaluacion-content');
    
    content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #004899;"></i>
            <p>Cargando trazabilidad de la prueba...</p>
        </div>
    `;
    
    if (modal) modal.classList.add('active');
};

window.cerrarModalDetalles = () => {
    const modal = document.getElementById('modal-cert-details');
    if (modal) modal.classList.remove('active');
};

// ==========================================
// INICIALIZADOR COMPLETO DEL MÓDULO
// ==========================================
export function initCertificadosModule() {
    poblarFiltroModulos();

    const inputFecha = document.getElementById('filter-cert-date');
    const selectModulo = document.getElementById('filter-cert-module');
    const buscadorTexto = document.getElementById('search-cert');

    if (inputFecha && !inputFecha.value) {
        const hoy = new Date();
        const offset = hoy.getTimezoneOffset();
        const hoyLocal = new Date(hoy.getTime() - (offset * 60 * 1000));
        inputFecha.value = hoyLocal.toISOString().split('T')[0];
    }

    if (inputFecha) {
        inputFecha.onchange = () => cargarTablaCertificados();
    }

    if (selectModulo) {
        selectModulo.onchange = () => cargarTablaCertificados();
    }

    if (buscadorTexto) {
        const nuevoBuscador = buscadorTexto.cloneNode(true);
        buscadorTexto.parentNode.replaceChild(nuevoBuscador, buscadorTexto);

        nuevoBuscador.addEventListener('input', function() {
            const term = this.value.toLowerCase();
            const rows = document.querySelectorAll('#cert-table-body tr');

            rows.forEach(row => {
                if (row.cells.length <= 1) return; 
                const textoFila = row.innerText.toLowerCase();
                row.style.display = textoFila.includes(term) ? '' : 'none';
            });
        });
    }

    console.log("✅ Módulo de Certificados inicializado con éxito.");
}

// Función para llenar el selector de filtros con los módulos reales de RTDB
export async function poblarFiltroModulos() {
    const selectModulo = document.getElementById('filter-cert-module');
    if (!selectModulo) return;

    try {
        const snapshot = await get(child(ref(db), "modulos"));
        selectModulo.innerHTML = '<option value="todos">Todos los módulos</option>';

        if (snapshot.exists()) {
            snapshot.forEach(docSnap => {
                const data = docSnap.val();
                const idTecnico = data.moduloId || docSnap.key; 
                const nombre = data.nombre || data.Nombre;      

                const option = document.createElement('option');
                option.value = idTecnico;
                option.textContent = `${idTecnico} - ${nombre}`;
                selectModulo.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error al poblar el filtro de módulos:", error);
    }
}

// ==========================================
// EXPORTAR CERTIFICADOS / NOTAS A EXCEL
// ==========================================
window.exportarCertificadosExcel = () => {
    const filasTabla = document.querySelectorAll('#cert-table-body tr');
    const datosParaExcel = [];

    filasTabla.forEach(fila => {
        if (fila.style.display === 'none' || fila.cells.length <= 1) return;

        const estudiante = fila.cells[0].innerText.replace(/\n/g, ' ').trim();
        const cedulaCorreo = fila.cells[1].innerText.replace(/\n/g, ' - ').trim();
        const modulo = fila.cells[2].innerText.replace(/\n/g, ' - ').trim();
        const nota = fila.cells[3].innerText.trim();

        datosParaExcel.push({
            "Estudiante": estudiante,
            "Cédula y Correo": cedulaCorreo,
            "Módulo Evaluado": modulo,
            "Nota Obtenida": nota
        });
    });

    if (datosParaExcel.length === 0) {
        alert("No hay registros de evaluaciones visibles en la tabla para exportar.");
        return;
    }

    try {
        const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Notas y Evaluaciones");

        const fechaHoy = new Date().toLocaleDateString().replace(/\//g, '-');
        XLSX.writeFile(libro, `Reporte_Notas_ITCA_${fechaHoy}.xlsx`);

        import('./historial.js').then(m => {
            m.registrarAccion('EXPORTAR', 'Certificados', `Descargó Excel de notas con ${datosParaExcel.length} registros.`);
        });

    } catch (error) {
        console.error("Error al generar Excel de notas:", error);
        alert("Hubo un error al intentar crear el archivo.");
    }
};
// ==========================================
// GENERADOR DE CERTIFICADOS PDF (CON FONDO OFICIAL, APELLIDO Y CÉDULA)
// ==========================================
window.generarCertificadoPDF = async (idResultado) => {
    const { jsPDF } = window.jspdf;
    
    // Importamos de Realtime Database
    const { get, ref: dbRef } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
    
    try {
        const snapshot = await get(dbRef(db, `resultados_evaluaciones/${idResultado}`));

        if (!snapshot.exists()) {
            alert("Error: No se encontraron los datos para generar este certificado.");
            return;
        }

        // 1. Extraemos los datos de la evaluación
        const data = snapshot.val();
        const idUsuario = data.usuarioId || data.cedula;
        
        // 2. Buscamos NOMBRE y APELLIDO del estudiante
        const usuarioSnap = await get(dbRef(db, `Usuarios/${idUsuario}`));
        let nombreCompleto = "ESTUDIANTE NO ENCONTRADO";
        
        if (usuarioSnap.exists()) {
            const infoUsr = usuarioSnap.val();
            
            // Buscamos las variables exactas sin importar si están en mayúscula o minúscula
            const nombre = infoUsr.nombre || infoUsr.Nombre || infoUsr.nombres || "";
            const apellido = infoUsr.apellido || infoUsr.Apellido || infoUsr.apellidos || "";
            
            // Unimos nombre y apellido, quitamos espacios extra y lo ponemos en mayúsculas
            nombreCompleto = `${nombre} ${apellido}`.trim().toUpperCase();
        }
        
        // 3. Necesitamos el nombre del módulo
        const moduloSnap = await get(dbRef(db, `modulos/${data.moduloId}`));
        const moduloNombre = moduloSnap.exists() ? moduloSnap.val().nombre : "Módulo de Realidad Aumentada";

        const fechaDoc = new Date(data.fecha || Date.now()).toLocaleDateString();

        // 4. Preparamos el documento PDF
        const docPDF = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const width = docPDF.internal.pageSize.getWidth();
        const height = docPDF.internal.pageSize.getHeight();
        const centroDerechoX = (width * 0.73); 

        // 5. CARGAMOS LA IMAGEN DE FONDO
        const base64Fondo = await imageToBase64('./assets/fondo_certificado.jpeg'); 
        docPDF.addImage(base64Fondo, 'JPEG', 0, 0, width, height); 

        // --- DISEÑO DE LOS TEXTOS ---
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(28); 
        docPDF.setTextColor(0, 72, 153); 
        docPDF.text("ITCA ACADEMY 2.0", centroDerechoX, 35, { align: "center" });

        docPDF.setFontSize(14);
        docPDF.setTextColor(100);
        docPDF.text("CENTRO DE CAPACITACIÓN", centroDerechoX, 42, { align: "center" });
        docPDF.text("TECNOLÓGICA", centroDerechoX, 47, { align: "center" });

        docPDF.setFontSize(20);
        docPDF.setTextColor(40);
        docPDF.text("CERTIFICADO DE APROBACIÓN", centroDerechoX, 70, { align: "center" });

        docPDF.setFont("helvetica", "normal");
        docPDF.setFontSize(13);
        docPDF.text("Se otorga el presente reconocimiento a:", centroDerechoX, 85, { align: "center" });

        // NOMBRE Y APELLIDO
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(26);
        docPDF.setTextColor(0, 0, 0);
        docPDF.text(nombreCompleto, centroDerechoX, 103, { align: "center" }); 
        
        // ¡NUEVO!: CÉDULA DE IDENTIDAD DEBAJO DEL NOMBRE
        docPDF.setFont("helvetica", "normal");
        docPDF.setFontSize(12);
        docPDF.setTextColor(80);
        docPDF.text(`Con documento de identidad (C.I.): ${idUsuario}`, centroDerechoX, 111, { align: "center" });

        // TEXTO DE APROBACIÓN (Lo bajamos un poquito para hacerle espacio a la cédula)
        docPDF.setFont("helvetica", "normal");
        docPDF.setFontSize(13);
        docPDF.setTextColor(60);
        docPDF.text(`Por haber aprobado satisfactoriamente`, centroDerechoX, 122, { align: "center" });
        docPDF.text(`la evaluación del módulo:`, centroDerechoX, 127, { align: "center" });
        
        docPDF.setFont("helvetica", "bold");
        const splitModulo = docPDF.splitTextToSize(`"${moduloNombre}"`, 110); 
        docPDF.text(splitModulo, centroDerechoX, 137, { align: "center" });

        // NOTA
        const notaNumerica = parseFloat(data.nota);
        docPDF.text(`Calificación: ${notaNumerica.toFixed(2)}/10`, centroDerechoX, 152, { align: "center" });

        // FECHA
        docPDF.setFontSize(11);
        docPDF.text(`Ibarra, Imbabura - ${fechaDoc}`, centroDerechoX, 167, { align: "center" });

        // FIRMAS
        const firmaIzqX = centroDerechoX - 35; 
        const firmaDerX = centroDerechoX + 35; 

        docPDF.setDrawColor(0); 
        docPDF.setLineWidth(0.4);

        docPDF.line(firmaIzqX - 25, 185, firmaIzqX + 25, 185); 
        docPDF.text("Coordinación ITCA", firmaIzqX, 191, { align: "center" });

        docPDF.line(firmaDerX - 25, 185, firmaDerX + 25, 185);
        docPDF.text("Instructor Responsable", firmaDerX, 191, { align: "center" });

        docPDF.setTextColor(60);
        docPDF.setFontSize(9);
        const splitPie = docPDF.splitTextToSize("Este certificado es válido como registro de actividad académica en la plataforma ITCA Academy.", 120);
        docPDF.text(splitPie, centroDerechoX, height - 12, { align: "center" });

        // 6. DESCARGAR EL ARCHIVO
        docPDF.save(`Certificado_${data.usuarioId}_${data.moduloId}.pdf`);

        // Registrar en historial
        import('./historial.js').then(m => m.registrarAccion('EXPORTAR', 'Certificados', `Generó PDF para ${nombreCompleto}`));

    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("Hubo un problema al crear el archivo PDF. Revisa la consola.");
    }
};

// ==========================================================
// GENERADOR DE PDF DE PRUEBA (SOLO LADO DERECHO DEL FONDO)
// ==========================================================
window.generarCertificadoPrueba = async () => {
    try {
        const { jsPDF } = window.jspdf;
        const rutaFondo = './assets/fondo_certificado.jpeg'; 

        const nombreCompleto = "ESTUDIANTE DE PRUEBA";
        const moduloNombre = "Nivel 1 - Te Vivo Imbabura";
        const nota = "10";
        const fechaDoc = new Date().toLocaleDateString();

        const docPDF = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const width = docPDF.internal.pageSize.getWidth();
        const height = docPDF.internal.pageSize.getHeight();
        const centroDerechoX = (width * 0.73); 

        console.log("Cargando imagen de fondo..."); 
        const base64Fondo = await imageToBase64(rutaFondo); 
        docPDF.addImage(base64Fondo, 'PNG', 0, 0, width, height); 

        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(28); 
        docPDF.setTextColor(0, 72, 153); 
        docPDF.text("ITCA ACADEMY 2.0", centroDerechoX, 35, { align: "center" });

        docPDF.setFontSize(14);
        docPDF.setTextColor(100);
        docPDF.text("CENTRO DE CAPACITACIÓN", centroDerechoX, 42, { align: "center" });
        docPDF.text("TECNOLÓGICA", centroDerechoX, 47, { align: "center" });

        docPDF.setFontSize(20);
        docPDF.setTextColor(40);
        docPDF.text("CERTIFICADO DE APROBACIÓN", centroDerechoX, 70, { align: "center" });

        docPDF.setFont("helvetica", "normal");
        docPDF.setFontSize(13);
        docPDF.text("Se otorga el presente reconocimiento a:", centroDerechoX, 85, { align: "center" });

        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(26);
        docPDF.setTextColor(0, 0, 0);
        docPDF.text(nombreCompleto, centroDerechoX, 105, { align: "center" }); 
        
        docPDF.setFont("helvetica", "normal");
        docPDF.setFontSize(13);
        docPDF.setTextColor(60);
        docPDF.text(`Por haber aprobado satisfactoriamente`, centroDerechoX, 120, { align: "center" });
        docPDF.text(`la evaluación del módulo:`, centroDerechoX, 125, { align: "center" });
        
        docPDF.setFont("helvetica", "bold");
        const splitModulo = docPDF.splitTextToSize(`"${moduloNombre}"`, 110); 
        docPDF.text(splitModulo, centroDerechoX, 135, { align: "center" });

        docPDF.text(`Calificación: ${nota}/10`, centroDerechoX, 150, { align: "center" });

        docPDF.setFontSize(11);
        docPDF.text(`Ibarra, Imbabura - ${fechaDoc}`, centroDerechoX, 165, { align: "center" });

        const firmaIzqX = centroDerechoX - 35; 
        const firmaDerX = centroDerechoX + 35; 

        docPDF.setDrawColor(0); 
        docPDF.setLineWidth(0.4);

        docPDF.line(firmaIzqX - 25, 185, firmaIzqX + 25, 185); 
        docPDF.text("Coordinación ITCA", firmaIzqX, 191, { align: "center" });

        docPDF.line(firmaDerX - 25, 185, firmaDerX + 25, 185);
        docPDF.text("Instructor Responsable", firmaDerX, 191, { align: "center" });

        docPDF.setTextColor(60);
        docPDF.setFontSize(9);
        const splitPie = docPDF.splitTextToSize("Este certificado es válido como registro de actividad académica en la plataforma ITCA Academy.", 120);
        docPDF.text(splitPie, centroDerechoX, height - 12, { align: "center" });

        docPDF.save(`Certificado_Prueba_ITCA.pdf`);

    } catch (error) {
        console.error("Error al generar PDF de prueba:", error);
        alert("Hubo un problema al crear el archivo. Revisa la consola.");
    }
};

async function imageToBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; 
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg')); // Lo dejamos en jpeg si tu fondo es .jpeg
        };
        img.onerror = (error) => reject(error);
        img.src = url;
    });
}