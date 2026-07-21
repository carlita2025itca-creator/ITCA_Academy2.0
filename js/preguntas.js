import { db } from './firebase-config.js';
import { ref, get, child, push, set, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { registrarAccion } from './historial.js';

let moduloActualId = ''; 

// 1. ABRIR LA SUB-VISTA DE PREGUNTAS
window.abrirGestionPreguntas = (docId, nombreModulo, idTecnico) => {
    moduloActualId = idTecnico; 
    
    document.getElementById('lbl-modulo-actual').innerText = nombreModulo;
    document.getElementById('panel-modulos-lista').style.display = 'none';
    document.getElementById('panel-preguntas-lista').style.display = 'block';
    
    cargarTablaPreguntas();
};

// 2. VOLVER A LA TABLA DE MÓDULOS
window.volverAModulos = () => {
    document.getElementById('panel-preguntas-lista').style.display = 'none';
    document.getElementById('panel-modulos-lista').style.display = 'block';
    moduloActualId = '';
};

// 3. CARGAR PREGUNTAS DE FIREBASE RTDB
async function cargarTablaPreguntas() {
    const tableBody = document.getElementById('preguntas-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Cargando preguntas...</td></tr>';

    try {
        const snapshot = await get(child(ref(db), "preguntas"));
        tableBody.innerHTML = '';
        
        if (!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #64748b;">No hay preguntas registradas aún.</td></tr>';
            return;
        }

        // 1. AGRUPAR Y CONTABILIZAR POR CATEGORÍA
        const preguntasAgrupadas = {};
        let hayPreguntasMódulo = false;

        snapshot.forEach(docSnap => {
            const data = docSnap.val();
            
            // Solo procesamos las preguntas que pertenecen al módulo actual
            if (data.moduloId === moduloActualId) {
                hayPreguntasMódulo = true;
                const id = docSnap.key;
                const categoria = data.categoria || 'Sin Categoría';

                // Si la categoría no existe en nuestro objeto, la inicializamos
                if (!preguntasAgrupadas[categoria]) {
                    preguntasAgrupadas[categoria] = [];
                }

                // Guardamos la pregunta dentro de su respectiva categoría
                preguntasAgrupadas[categoria].push({ id, ...data });
            }
        });

        if (!hayPreguntasMódulo) {
            tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #64748b;">No hay preguntas en este módulo aún.</td></tr>';
            return;
        }

        // 2. RENDERIZAR VISUALMENTE EN LA TABLA
        // Recorremos el objeto categoría por categoría
        for (const categoria in preguntasAgrupadas) {
            const listaPreguntas = preguntasAgrupadas[categoria];
            const totalPreguntasCat = listaPreguntas.length;

            // Fila separadora/encabezado de la Categoría con su respectivo contador
            tableBody.innerHTML += `
                <tr style="background-color: #f8fafc; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;">
                    <td colspan="2" style="padding: 10px 15px; font-weight: 700; color: #334155; font-size: 0.95rem;">
                        <i class="fas fa-folder-open" style="color: #0284c7; margin-right: 8px;"></i> 
                        Categoría: <span style="color: #0284c7;">${categoria}</span> 
                        <span style="margin-left: 10px; font-size: 0.8rem; background: #e2e8f0; color: #475569; padding: 3px 8px; border-radius: 20px; font-weight: 600;">
                            ${totalPreguntasCat} ${totalPreguntasCat === 1 ? 'pregunta' : 'preguntas'}
                        </span>
                    </td>
                </tr>
            `;

            // Renderizamos las preguntas pertenecientes a esta categoría
            listaPreguntas.forEach(data => {
                tableBody.innerHTML += `
                    <tr>
                        <td style="padding-left: 25px;">
                            <div style="font-weight: 600; color: #1e293b; margin-bottom: 5px;">${data.enunciado}</div>
                            <div style="font-size: 0.8rem; color: #64748b;">
                                <span style="color: #166534; font-weight: bold;">
                                    <i class="fas fa-check"></i> ${data.opciones[0]}
                                </span>
                                <span style="margin-left: 10px; color: #94a3b8;">
                                    (Incorrectas: ${data.opciones[1] || ''}, ${data.opciones[2] || ''}, ${data.opciones[3] || ''})
                                </span>
                            </div>
                        </td>
                        <td style="text-align: right; vertical-align: middle;">
                            <button class="btn-action" onclick="editarPregunta('${data.id}')" style="padding: 6px; margin-right: 5px;" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn-action" onclick="eliminarPregunta('${data.id}')" style="padding: 6px; color: #ef4444;" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

    } catch (error) {
        console.error("Error al cargar y agrupar preguntas:", error);
        tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #ef4444;">Error al cargar datos.</td></tr>';
    }
}


// 4. CONTROL DEL MODAL DE PREGUNTAS
// ==========================================
// FUNCIÓN AUXILIAR: VERIFICAR PERMISOS DE CATEGORÍA
// ==========================================
function verificarPermisoCategoria() {
    const rolActual = (window.rolUsuarioActual || localStorage.getItem('rol') || '').toLowerCase().trim();
    const esAdmin = (rolActual === 'superadmin' || rolActual === 'admin' || rolActual === 'rol_administrador');
    const btnAddCat = document.getElementById('btn-add-cat-pregunta');
    
    if (btnAddCat) {
        btnAddCat.style.display = esAdmin ? 'inline-block' : 'none';
    }
}

const modal = document.getElementById('modal-pregunta');
const form = document.getElementById('form-pregunta');

// ==========================================
// CONTROL DEL MODAL DE PREGUNTAS
// ==========================================
window.abrirModalPregunta = () => {
    form.reset();
    document.getElementById('preg-id').value = '';
    
    cargarCategoriasPreguntasSelect('preg-categoria');
    verificarPermisoCategoria(); // <-- Verificamos el rol al abrir
    
    document.getElementById('modal-pregunta-titulo').innerHTML = '<i class="fas fa-plus"></i> Nueva Pregunta';
    modal.classList.add('active');
};

window.cerrarModalPregunta = () => {
    modal.classList.remove('active');
};

// 5. GUARDAR O ACTUALIZAR PREGUNTA EN RTDB
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const idEdicion = document.getElementById('preg-id').value;
    
    const opcionesArray = [
        document.getElementById('preg-op0').value.trim(),
        document.getElementById('preg-op1').value.trim(),
        document.getElementById('preg-op2').value.trim(),
        document.getElementById('preg-op3').value.trim()
    ];

    const datosPregunta = {
        moduloId: moduloActualId,
        categoria: document.getElementById('preg-categoria').value.trim(), // CAPTURA LA CATEGORÍA
        enunciado: document.getElementById('preg-enunciado').value.trim(),
        opciones: opcionesArray,
        correcta: 0 
    };

    try {
        if (idEdicion) {
            await update(ref(db, `preguntas/${idEdicion}`), datosPregunta);
            registrarAccion('EDITAR', 'Preguntas', `Actualizó pregunta en módulo: ${moduloActualId}`);
        } else {
            const nuevaReferencia = push(ref(db, "preguntas"));
            await set(nuevaReferencia, datosPregunta);
            registrarAccion('CREAR', 'Preguntas', `Añadió pregunta al módulo: ${moduloActualId}`);
        }
        
        cerrarModalPregunta();
        cargarTablaPreguntas();
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar la pregunta.");
    }
});

// 6. ELIMINAR PREGUNTA EN RTDB
window.eliminarPregunta = async (id) => {
    if(confirm("¿Estás segura de eliminar esta pregunta?")) {
        try {
            await remove(ref(db, `preguntas/${id}`));
            registrarAccion('ELIMINAR', 'Preguntas', `Eliminó pregunta del módulo: ${moduloActualId}`);
            cargarTablaPreguntas();
        } catch (error) {
            console.error("Error al eliminar la pregunta:", error);
        }
    }
};

// 7. CARGAR DATOS PARA EDITAR DESDE RTDB
// ==========================================
// CARGAR DATOS PARA EDITAR DESDE RTDB
// ==========================================
window.editarPregunta = async (id) => {
    try {
        const snapshot = await get(child(ref(db), `preguntas/${id}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            document.getElementById('preg-id').value = id;
            document.getElementById('preg-enunciado').value = data.enunciado;
            document.getElementById('preg-op0').value = data.opciones[0];
            document.getElementById('preg-op1').value = data.opciones[1];
            document.getElementById('preg-op2').value = data.opciones[2];
            document.getElementById('preg-op3').value = data.opciones[3];
            
            cargarCategoriasPreguntasSelect('preg-categoria', data.categoria || ''); 
            verificarPermisoCategoria(); // <-- Verificamos el rol al editar
            
            document.getElementById('modal-pregunta-titulo').innerHTML = '<i class="fas fa-edit"></i> Editar Pregunta';
            modal.classList.add('active');
        }
    } catch (error) {
        console.error("Error cargando los datos para editar:", error);
    }
};

// ==========================================
// 8. MOTOR DE IMPORTACIÓN DESDE EXCEL
// ==========================================
const inputExcel = document.getElementById('input-excel-preguntas');
if (inputExcel) {
    inputExcel.addEventListener('change', async (evento) => {
        const archivo = evento.target.files[0];
        if (!archivo) return;
        if (!moduloActualId) return alert("Error: Selecciona primero un módulo.");

        const lector = new FileReader();
        lector.onload = async (e) => {
            try {
                const dataBytes = new Uint8Array(e.target.result);
                const workbook = XLSX.read(dataBytes, { type: 'array' });
                const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
                const filasExcel = XLSX.utils.sheet_to_json(primeraHoja);

                if (filasExcel.length === 0) return alert("El archivo Excel está vacío.");

                let importadas = 0;

                for (const fila of filasExcel) {
                    const enunciado = fila['Pregunta'];
                    const categoria = fila['Categoría'];
                    const correctaTexto = fila['Respuesta Correcta'] ? fila['Respuesta Correcta'].toString().trim() : '';

                    if (enunciado && categoria && correctaTexto) {
                        // Creamos la lista base de opciones incorrectas
                        let incorrectas = [
                            fila['Opción Incorrecta 1'] ? fila['Opción Incorrecta 1'].toString().trim() : '',
                            fila['Opción Incorrecta 2'] ? fila['Opción Incorrecta 2'].toString().trim() : '',
                            fila['Opción Incorrecta 3'] ? fila['Opción Incorrecta 3'].toString().trim() : ''
                        ];

                        // Mantenemos la estructura de Unity: La posición [0] DEBE ser la correcta.
                        const opcionesFinales = [correctaTexto, ...incorrectas];

                        const objetoPregunta = {
                            moduloId: moduloActualId,
                            categoria: categoria.toString().trim(),
                            enunciado: enunciado.toString().trim(),
                            opciones: opcionesFinales,
                            correcta: 0
                        };

                        const nuevaRef = push(ref(db, 'preguntas'));
                        await set(nuevaRef, objetoPregunta);
                        importadas++;
                    }
                }

                alert(`✅ Éxito: Se importaron ${importadas} preguntas de forma masiva.`);
                inputExcel.value = ""; 
                cargarTablaPreguntas();
                registrarAccion('CREAR', 'Preguntas', `Importación masiva de ${importadas} preguntas en módulo: ${moduloActualId}`);

            } catch (error) {
                console.error("Error al procesar el Excel:", error);
                alert("Error al leer el archivo. Asegúrate de usar el formato correcto.");
            }
        };
        lector.readAsArrayBuffer(archivo);
    });
}

// ==========================================
// DESCARGAR PLANTILLA EXCEL
// ==========================================
window.descargarPlantillaExcel = () => {
    const datosEjemplo = [{
        "Pregunta": "¿Cuál es la capital de Imbabura?",
        "Categoría": "Geografía",
        "Respuesta Correcta": "Ibarra",
        "Opción Incorrecta 1": "Otavalo",
        "Opción Incorrecta 2": "Cotacachi",
        "Opción Incorrecta 3": "Atuntaqui"
    }];

    const hoja = XLSX.utils.json_to_sheet(datosEjemplo);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Plantilla");
    
    // Auto-ajustar el ancho de las columnas
    hoja['!cols'] = [{wch: 35}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}];
    
    XLSX.writeFile(libro, "Plantilla_Preguntas.xlsx");
};

// ==========================================
// ABRIR VIDEO TUTORIAL
// ==========================================
window.abrirTutorial = () => {
    // Reemplaza este link por la URL de tu video real en YouTube o Drive
    const urlVideo = "https://www.youtube.com/watch?v=AQUI_TU_VIDEO";
    window.open(urlVideo, "_blank");
};

// ==========================================
// GESTIÓN DE CATEGORÍAS DE PREGUNTAS
// ==========================================
window.abrirModalCategoriaPregunta = () => document.getElementById('modal-cat-pregunta').classList.add('active');
window.cerrarModalCategoriaPregunta = () => {
    document.getElementById('modal-cat-pregunta').classList.remove('active');
    document.getElementById('form-add-cat-pregunta').reset();
};

async function cargarCategoriasPreguntasSelect(selectId, categoriaAsignada = "") {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const snapshot = await get(child(ref(db), "categorias_preguntas"));
        select.innerHTML = '<option value="">Seleccione una categoría...</option>';

        if (snapshot.exists()) {
            snapshot.forEach(doc => {
                const nombre = doc.val().nombre;
                const selected = (nombre === categoriaAsignada) ? 'selected' : '';
                select.innerHTML += `<option value="${nombre}" ${selected}>${nombre}</option>`;
            });
        }
    } catch (error) {
        console.error("Error al cargar categorías de preguntas:", error);
    }
}

// Guardar nueva categoría de pregunta en Firebase
const formCatPregunta = document.getElementById('form-add-cat-pregunta');
if (formCatPregunta) {
    formCatPregunta.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreCat = document.getElementById('cat-preg-nombre').value.trim();
        
        try {
            const nuevaCatRef = push(ref(db, 'categorias_preguntas'));
            await set(nuevaCatRef, { nombre: nombreCat });
            
            alert("Categoría guardada con éxito.");
            cerrarModalCategoriaPregunta();
            
            // Recarga el selector con la nueva opción
            cargarCategoriasPreguntasSelect('preg-categoria');
        } catch (error) {
            console.error("Error:", error);
            alert("Error al guardar la categoría.");
        }
    });
}
// ==========================================
// EXPORTAR PREGUNTAS A EXCEL (Solo en preguntas.js)
// ==========================================
window.exportarPreguntasExcel = async () => {
    try {
        if (!moduloActualId) {
            return alert("Error interno: No se ha detectado el ID del módulo.");
        }

        const moduloActualNombre = document.getElementById('lbl-modulo-actual').innerText;
        const datosParaExcel = [];

        // Consultamos Firebase
        const snapshot = await get(child(ref(db), "preguntas"));
        
        if (!snapshot.exists()) {
            return alert("No hay preguntas disponibles en la base de datos.");
        }

        // Obtenemos los datos del módulo para el encabezado
        const moduloSnapshot = await get(child(ref(db), `modulos/${moduloActualId}`));
        let docenteEncargado = "Sin asignar";
        let categoriaModulo = "General";
        
        if (moduloSnapshot.exists()) {
            const modData = moduloSnapshot.val();
            docenteEncargado = modData.docenteAsignado || "Sin asignar";
            categoriaModulo = modData.categoria || "General";
        }

        // Filtramos y estructuramos las preguntas
        snapshot.forEach(docSnap => {
            const data = docSnap.val();
            
            if (data.moduloId === moduloActualId) {
                datosParaExcel.push({
                    "Módulo": moduloActualNombre,
                    "Docente Encargado": docenteEncargado,
                    "Categoría Módulo": categoriaModulo,
                    "Categoría Pregunta": data.categoria || "Sin categoría",
                    "Enunciado de la Pregunta": data.enunciado,
                    "Respuesta Correcta": data.opciones[0] || "",
                    "Opción Incorrecta 1": data.opciones[1] || "",
                    "Opción Incorrecta 2": data.opciones[2] || "",
                    "Opción Incorrecta 3": data.opciones[3] || ""
                });
            }
        });

        if (datosParaExcel.length === 0) {
            return alert("No hay preguntas en este módulo para exportar.");
        }

        // Ordenamos alfabéticamente por la categoría de la pregunta
        datosParaExcel.sort((a, b) => a["Categoría Pregunta"].localeCompare(b["Categoría Pregunta"]));

        // Construcción del Excel
        const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Banco de Preguntas");
        
        // Ajuste automático del ancho de columnas
        hoja['!cols'] = [
            {wch: 25}, {wch: 25}, {wch: 20}, {wch: 20}, 
            {wch: 50}, {wch: 25}, {wch: 25}, {wch: 25}, {wch: 25}
        ];

        XLSX.writeFile(libro, `Preguntas_${moduloActualNombre}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
        
        import('./historial.js').then(m => m.registrarAccion('EXPORTAR', 'Preguntas', `Descargó reporte ordenado de preguntas del módulo: ${moduloActualId}.`));

    } catch (error) {
        console.error("Error al exportar:", error);
        alert(`Fallo en la exportación: ${error.message}\nRevisa la consola (F12) para más detalles.`);
    }
};