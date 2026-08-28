import { db } from './firebase-config.js';
// 1. CAMBIO: Importaciones de Realtime Database
import { ref, get, child, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { registrarAccion } from './historial.js';

export async function cargarTablaCertificados() {
    const tableBody = document.getElementById('cert-table-body');
    if (!tableBody) return;

    const filtroFechaInput = document.getElementById('filter-cert-date');
    const fechaSeleccionada = filtroFechaInput ? filtroFechaInput.value : ''; 
    
    const filtroModulo = document.getElementById('filter-cert-module') ? document.getElementById('filter-cert-module').value : 'todos';

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Buscando registros...</td></tr>';

    try {
        const snapshot = await get(child(ref(db), "registro_evaluaciones"));
        
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

        // Ordenamos usando la fecha del POST, o la del PRE si no hay POST
        resultadosArray.sort((a, b) => {
            const fechaA = (a.POST && a.POST.fecha) ? a.POST.fecha : (a.PRE && a.PRE.fecha ? a.PRE.fecha : a.fecha);
            const fechaB = (b.POST && b.POST.fecha) ? b.POST.fecha : (b.PRE && b.PRE.fecha ? b.PRE.fecha : b.fecha);
            return new Date(fechaB || 0) - new Date(fechaA || 0);
        });

        resultadosArray.forEach(data => {
            const id = data.id;
            const idUsuario = data.usuarioId || data.cedula; 
            const idModulo = data.moduloId;
            
            const infoUsuario = usuariosDB[idUsuario] || {};
            const infoModulo = modulosDB[idModulo] || {};

            const nombreEstudiante = infoUsuario.nombre || infoUsuario.nombres || "Estudiante";
            const apellidoEstudiante = infoUsuario.apellido || infoUsuario.apellidos || "";
            const correoEstudiante = infoUsuario.correo || infoUsuario.Correo || "Sin correo";
            const nombreModuloReal = infoModulo.nombre || infoModulo.Nombre || "Módulo Desconocido";
            
            // VERIFICAMOS SI TIENE PRE Y POST
            const tienePre = !!data.PRE;
            const tienePost = !!data.POST;

            const fechaTexto = tienePost ? data.POST.fecha : (tienePre ? data.PRE.fecha : data.fecha);
            const fechaJS = new Date(fechaTexto ? fechaTexto.replace(/-/g, '/') : Date.now());
            const fechaDocFormateada = `${fechaJS.getFullYear()}-${String(fechaJS.getMonth() + 1).padStart(2, '0')}-${String(fechaJS.getDate()).padStart(2, '0')}`;

            let mostrar = true;
            if (fechaSeleccionada && fechaDocFormateada !== fechaSeleccionada) mostrar = false;
            if (filtroModulo !== 'todos' && idModulo !== filtroModulo) mostrar = false;

            if (mostrar) {
                contadorMostrados++;

                // ==========================================
                // CREACIÓN DE LAS ETIQUETAS PRE Y POST
                // ==========================================
                let htmlNotas = `<div style="display: flex; flex-direction: column; gap: 5px;">`;

                // DISEÑO PRE
                if (tienePre) {
                    const notaPre = parseFloat(data.PRE.nota || 0);
                    const color = notaPre >= 7 ? '#166534' : '#ef4444';
                    const bg = notaPre >= 7 ? '#dcfce7' : '#fef2f2';
                    htmlNotas += `<span style="background: ${bg}; color: ${color}; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; border: 1px solid ${color};">PRE: ${notaPre.toFixed(2)}/10</span>`;
                } else {
                    htmlNotas += `<span style="background: #f1f5f9; color: #64748b; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; border: 1px solid #cbd5e1;">PRE: Pendiente</span>`;
                }

                // DISEÑO POST
                if (tienePost) {
                    const notaPost = parseFloat(data.POST.nota || 0);
                    const color = notaPost >= 7 ? '#166534' : '#ef4444';
                    const bg = notaPost >= 7 ? '#dcfce7' : '#fef2f2';
                    htmlNotas += `<span style="background: ${bg}; color: ${color}; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; border: 1px solid ${color};">POST: ${notaPost.toFixed(2)}/10</span>`;
                } else {
                    htmlNotas += `<span style="background: #f1f5f9; color: #64748b; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; border: 1px solid #cbd5e1;">POST: Pendiente</span>`;
                }
                htmlNotas += `</div>`;

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
                            ${htmlNotas} 
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
window.verDetallesEvaluacion = async (id) => {
    const modal = document.getElementById('modal-cert-details');
    const content = document.getElementById('detalles-evaluacion-content');
    
    content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #004899;"></i>
            <p>Cargando trazabilidad de la prueba...</p>
        </div>
    `;
    
    if (modal) modal.classList.add('active');

    try {
        const snapshot = await get(child(ref(db), `registro_evaluaciones/${id}`));
        
        if (!snapshot.exists()) {
            content.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">No se encontraron detalles.</div>`;
            return;
        }

        const data = snapshot.val();
        let htmlTotal = "";

        // Función interna para generar la interfaz de PRE y luego la de POST sin repetir código
        const generarBloqueEvaluacion = (titulo, evaluacion) => {
            if (!evaluacion) {
                return `<div style="padding: 15px; background: #f8fafc; color: #64748b; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; text-align: center;"><strong>${titulo}</strong>: Aún no registrada</div>`;
            }

            const aciertos = evaluacion.aciertos || 0;
            const total = evaluacion.totalPreguntas || 10;
            const nota = parseFloat(evaluacion.nota || 0).toFixed(2);
            const fecha = evaluacion.fecha || "Fecha desconocida";

            let html = `
                <div style="margin-bottom: 15px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
                    <h4 style="margin: 0 0 10px 0; color: #0369a1; font-size: 1.1rem;">${titulo}</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.9rem; color: #334155;">
                        <div><strong>Nota Final:</strong> <span style="color: ${nota >= 7 ? '#16a34a' : '#dc2626'}; font-weight: bold; font-size: 1rem;">${nota}/10</span></div>
                        <div><strong>Aciertos:</strong> ${aciertos} de ${total}</div>
                        <div style="grid-column: span 2;"><strong>Fecha:</strong> ${fecha}</div>
                    </div>
                </div>
            `;

            if (evaluacion.detalle_preguntas && evaluacion.detalle_preguntas.length > 0) {
                html += `<h5 style="margin-bottom: 10px; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">Trazabilidad (${titulo})</h5>`;
                html += `<div style="max-height: 250px; overflow-y: auto; padding-right: 5px; margin-bottom: 25px;">`;
                
                evaluacion.detalle_preguntas.forEach((pregunta, index) => {
                    const esCorrecta = pregunta.esCorrecta || pregunta.correcta || false; 
                    const color = esCorrecta ? '#166534' : '#991b1b';
                    const bg = esCorrecta ? '#dcfce7' : '#fee2e2';
                    const icono = esCorrecta ? 'fa-check-circle' : 'fa-times-circle';
                    
                    html += `
                        <div style="background-color: ${bg}; color: ${color}; padding: 12px; margin-bottom: 8px; border-radius: 6px; font-size: 0.85rem; display: flex; gap: 10px; align-items: flex-start;">
                            <i class="fas ${icono}" style="margin-top: 3px; font-size: 1.1rem;"></i>
                            <div style="flex: 1;">
                                <strong>Pregunta ${index + 1}:</strong> ${pregunta.textoPregunta || pregunta.pregunta || "Detalle no disponible"}
                                <div style="font-size: 0.8rem; margin-top: 6px; color: #475569; background: rgba(255,255,255,0.5); padding: 4px 8px; border-radius: 4px;">
                                    <strong>Respuesta elegida:</strong> ${pregunta.respuestaSeleccionada || pregunta.respuesta || "No registrada"}
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += `</div>`;
            }
            return html;
        };

        // Unimos los dos bloques y los mostramos en pantalla
        htmlTotal += generarBloqueEvaluacion("Evaluación PRE", data.PRE);
        htmlTotal += generarBloqueEvaluacion("Evaluación POST", data.POST);

        content.innerHTML = htmlTotal;

    } catch (error) {
        console.error("Error al cargar detalles:", error);
        content.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">Error de conexión.</div>`;
    }
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