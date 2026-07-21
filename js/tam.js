// tam.js
import { db } from './firebase-config.js';
import { ref, get, child, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let datosTAM = [];
// Aquí guardaremos la estructura del cuestionario mientras el admin la edita
let configuracionActual = []; 

export const initTamModule = () => {
    const btnExportar = document.getElementById('btn-exportar-tam');
    const inputBuscar = document.getElementById('buscar-tam');

    // Elementos del Modal Dinámico
    const modalTam = document.getElementById('modal-tam');
    const btnAbrirModal = document.getElementById('btn-configurar-preguntas');
    const btnCerrarModalX = document.getElementById('btn-cerrar-modal-tam');
    const btnCancelarModal = document.getElementById('btn-cancelar-modal-tam');
    const btnGuardarPreguntas = document.getElementById('btn-guardar-preguntas');
    const btnAgregarCategoria = document.getElementById('btn-agregar-categoria');
    const contenedorCategorias = document.getElementById('contenedor-categorias');

    // Elementos del Selector de Modo / Límite de Preguntas
    const selectModo = document.getElementById('select-modo-preguntas');
    const wrapperLimite = document.getElementById('wrapper-limite-preguntas');
    const inputLimite = document.getElementById('input-limite-preguntas');

    console.log("--- DIAGNÓSTICO TAM ---");
    console.log("¿Encontró el botón?:", btnAbrirModal ? "Sí" : "NO");
    console.log("¿Encontró el modal?:", modalTam ? "Sí" : "NO");

    // ==========================================
    // CONTROL VISUAL DEL MODO DE DESPLIEGUE
    // ==========================================
    if (selectModo) {
        selectModo.addEventListener('change', () => {
            const esLimite = selectModo.value === 'limite';
            if (wrapperLimite) {
                wrapperLimite.style.opacity = esLimite ? '1' : '0.5';
                wrapperLimite.style.pointerEvents = esLimite ? 'auto' : 'none';
            }
            if (inputLimite) {
                inputLimite.disabled = !esLimite;
            }
        });
    }

    // ==========================================
    // 1. ABRIR MODAL Y DESCARGAR DATOS
    // ==========================================
    if (btnAbrirModal) {
        btnAbrirModal.addEventListener('click', async () => {
            console.log("¡Clic detectado!");
            modalTam.style.display = 'flex';
            contenedorCategorias.innerHTML = '<p style="text-align:center; padding: 20px; color: #64748b;"><i class="fas fa-spinner fa-spin"></i> Descargando configuración actual...</p>';
            
            try {
                // Leemos la ruta completa de ConfiguracionTAM
                const snapshot = await get(child(ref(db), "ConfiguracionTAM"));
                
                if (snapshot.exists()) {
                    const data = snapshot.val();

                    // Detectar si los datos están bajo la nueva estructura u la antigua
                    let categoriasData = [];
                    let modoGuardado = 'todas';
                    let cantidadGuardada = 5;

                    if (data.categorias || data.Categorias) {
                        categoriasData = data.categorias || data.Categorias;
                        modoGuardado = data.modo || 'todas';
                        cantidadGuardada = data.cantidad || 5;
                    } else {
                        // Soporte para estructura previa de solo array
                        categoriasData = data;
                    }

                    // Asignar categorías
                    configuracionActual = Array.isArray(categoriasData) ? categoriasData : Object.values(categoriasData);

                    // Restaurar los valores en el HTML
                    if (selectModo) selectModo.value = modoGuardado;
                    if (inputLimite) inputLimite.value = cantidadGuardada;

                } else {
                    // Si la base de datos está vacía, creamos una categoría de ejemplo
                    configuracionActual = [{
                        titulo: 'Facilidad de Uso',
                        opciones: ['Muy difícil', 'Difícil', 'Neutral', 'Fácil', 'Muy fácil'],
                        preguntas: ['¿Qué tan fácil fue aprender a usar la Realidad Aumentada?']
                    }];
                    if (selectModo) selectModo.value = 'todas';
                    if (inputLimite) inputLimite.value = 5;
                }

                // Disparar evento para actualizar el estado visual del input (activado/desactivado)
                if (selectModo) selectModo.dispatchEvent(new Event('change'));

                renderizarConstructor();

            } catch (error) {
                console.error("Error al cargar configuración:", error);
                contenedorCategorias.innerHTML = '<p style="color:red; text-align:center;">Error al conectar con la base de datos.</p>';
            }
        });
    }

    // ==========================================
    // 2. CERRAR MODAL
    // ==========================================
    const cerrarModal = () => {
        modalTam.style.display = 'none';
    };
    if (btnCerrarModalX) btnCerrarModalX.addEventListener('click', cerrarModal);
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModal);

    // ==========================================
    // 3. RENDERIZAR EL CONSTRUCTOR VISUAL
    // ==========================================
    const renderizarConstructor = () => {
        contenedorCategorias.innerHTML = ''; // Limpiamos la pantalla

        if (configuracionActual.length === 0) {
            contenedorCategorias.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">No hay categorías. Haz clic en "Nueva Categoría" para empezar.</p>';
            return;
        }

        // Recorremos cada categoría y creamos su tarjeta HTML
        configuracionActual.forEach((categoria, catIndex) => {
            categoria.opciones = categoria.opciones || [];
            categoria.preguntas = categoria.preguntas || [];

            // Generamos HTML de opciones
            let htmlOpciones = categoria.opciones.map((op, opIndex) => `
                <div style="display:flex; gap:5px; margin-bottom:8px;">
                    <input type="text" class="input-opcion" data-cat="${catIndex}" data-op="${opIndex}" value="${op}" placeholder="Ej: Excelente" style="flex-grow:1; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    <button class="btn-eliminar-opcion" data-cat="${catIndex}" data-op="${opIndex}" style="background:#ef4444; color:white; border:none; padding:0 10px; border-radius:4px; cursor:pointer;" title="Eliminar Opción"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');

            // Generamos HTML de preguntas
            let htmlPreguntas = categoria.preguntas.map((preg, pregIndex) => `
                <div style="display:flex; gap:5px; margin-bottom:8px;">
                    <input type="text" class="input-pregunta" data-cat="${catIndex}" data-preg="${pregIndex}" value="${preg}" placeholder="Escribe tu pregunta aquí..." style="flex-grow:1; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    <button class="btn-eliminar-pregunta" data-cat="${catIndex}" data-preg="${pregIndex}" style="background:#ef4444; color:white; border:none; padding:0 10px; border-radius:4px; cursor:pointer;" title="Eliminar Pregunta"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');

            // Unimos todo en la tarjeta de la categoría
            const htmlCategoria = `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:15px; margin-bottom:20px; position:relative;">
                    
                    <button class="btn-eliminar-categoria" data-cat="${catIndex}" style="position:absolute; top:15px; right:15px; background:none; border:none; color:#b91c1c; cursor:pointer; font-size:1.2em;" title="Eliminar Categoría entera"><i class="fas fa-times-circle"></i></button>
                    
                    <label style="font-weight:bold; color:#0f172a;">Nombre de la Categoría (Ej: Utilidad):</label>
                    <input type="text" class="input-titulo" data-cat="${catIndex}" value="${categoria.titulo || ''}" placeholder="Ej: Facilidad de Uso" style="width:80%; padding:8px; margin-top:5px; margin-bottom:15px; border:1px solid #ccc; border-radius:5px; display:block; font-weight:bold;">
                    
                    <div style="display:flex; gap:20px; flex-wrap:wrap;">
                        
                        <!-- Columna: Opciones de Respuesta -->
                        <div style="flex:1; min-width: 200px; background:white; padding:10px; border-radius:5px; border:1px solid #e2e8f0;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                <label style="font-weight:bold; font-size:0.9em; color:#004899;">Respuestas permitidas</label>
                                <button class="btn-add-opcion" data-cat="${catIndex}" style="background:#e0f2fe; color:#0369a1; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8em;"><i class="fas fa-plus"></i> Añadir</button>
                            </div>
                            <div>${htmlOpciones}</div>
                        </div>

                        <!-- Columna: Preguntas -->
                        <div style="flex:2; min-width: 250px; background:white; padding:10px; border-radius:5px; border:1px solid #e2e8f0;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                <label style="font-weight:bold; font-size:0.9em; color:#166534;">Preguntas a evaluar</label>
                                <button class="btn-add-pregunta" data-cat="${catIndex}" style="background:#dcfce7; color:#166534; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8em;"><i class="fas fa-plus"></i> Añadir</button>
                            </div>
                            <div>${htmlPreguntas}</div>
                        </div>
                    </div>
                </div>
            `;
            
            contenedorCategorias.insertAdjacentHTML('beforeend', htmlCategoria);
        });
    };

    // ==========================================
    // 4. ESCUCHAR LOS CAMBIOS (EVENT DELEGATION)
    // ==========================================
    if (contenedorCategorias) {
        contenedorCategorias.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const catIdx = target.getAttribute('data-cat');
            
            if (target.classList.contains('btn-add-opcion')) {
                configuracionActual[catIdx].opciones.push('');
                renderizarConstructor();
            } 
            else if (target.classList.contains('btn-add-pregunta')) {
                configuracionActual[catIdx].preguntas.push('');
                renderizarConstructor();
            } 
            else if (target.classList.contains('btn-eliminar-opcion')) {
                const opIdx = target.getAttribute('data-op');
                configuracionActual[catIdx].opciones.splice(opIdx, 1);
                renderizarConstructor();
            } 
            else if (target.classList.contains('btn-eliminar-pregunta')) {
                const pregIdx = target.getAttribute('data-preg');
                configuracionActual[catIdx].preguntas.splice(pregIdx, 1);
                renderizarConstructor();
            } 
            else if (target.classList.contains('btn-eliminar-categoria')) {
                if (confirm('¿Estás seguro de eliminar esta categoría completa con todas sus preguntas?')) {
                    configuracionActual.splice(catIdx, 1);
                    renderizarConstructor();
                }
            }
        });

        contenedorCategorias.addEventListener('input', (e) => {
            const catIdx = e.target.getAttribute('data-cat');
            
            if (e.target.classList.contains('input-titulo')) {
                configuracionActual[catIdx].titulo = e.target.value;
            } 
            else if (e.target.classList.contains('input-opcion')) {
                const opIdx = e.target.getAttribute('data-op');
                configuracionActual[catIdx].opciones[opIdx] = e.target.value;
            } 
            else if (e.target.classList.contains('input-pregunta')) {
                const pregIdx = e.target.getAttribute('data-preg');
                configuracionActual[catIdx].preguntas[pregIdx] = e.target.value;
            }
        });
    } else {
        console.warn("Aviso: No se encontró el 'contenedor-categorias' en el HTML.");
    }

    // ==========================================
    // 5. BOTONES GLOBALES
    // ==========================================
    if (btnAgregarCategoria) {
        btnAgregarCategoria.addEventListener('click', () => {
            configuracionActual.push({
                titulo: '',
                opciones: ['1', '2', '3', '4', '5'],
                preguntas: ['']
            });
            renderizarConstructor();
            contenedorCategorias.scrollTop = contenedorCategorias.scrollHeight;
        });
    }

    if (btnGuardarPreguntas) {
        btnGuardarPreguntas.addEventListener('click', async () => {
            const originalText = btnGuardarPreguntas.innerHTML;
            btnGuardarPreguntas.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btnGuardarPreguntas.disabled = true;

            const modoElegido = selectModo ? selectModo.value : 'todas';
            const cantidadNum = inputLimite ? (parseInt(inputLimite.value, 10) || 5) : 5;

            // Construimos la estructura JSON que guardaremos en Firebase
            const objetoConfiguracion = {
                modo: modoElegido,
                cantidad: modoElegido === 'limite' ? cantidadNum : 0, // 0 indica sin límite (todas)
                categorias: configuracionActual
            };

            try {
                // Guardamos en 'ConfiguracionTAM'
                await set(ref(db, 'ConfiguracionTAM'), objetoConfiguracion);
                alert("¡La configuración y preguntas han sido guardadas exitosamente! Unity ya puede descargarlas.");
                cerrarModal();
            } catch (error) {
                console.error("Error guardando en Firebase:", error);
                alert("Ocurrió un error al intentar guardar.");
            } finally {
                btnGuardarPreguntas.innerHTML = originalText;
                btnGuardarPreguntas.disabled = false;
            }
        });
    }

    // ==========================================
    // 6. FUNCIONALIDADES DE LA TABLA
    // ==========================================
    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            console.log("Exportando a Excel...");
        });
    }

    if (inputBuscar) {
        inputBuscar.addEventListener('input', (e) => {
            const terminoBusqueda = e.target.value.toLowerCase().trim();
            filtrarTabla(terminoBusqueda);
        });
    }
};

// ==========================================
// DESCARGA Y RENDERIZADO DE TABLA (Resultados)
// ==========================================
export const cargarTablaTAM = async () => {
    const tbody = document.getElementById('tabla-tam-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Cargando evaluaciones desde Firebase...</td></tr>';

    try {
        const snapshot = await get(child(ref(db), "EvaluacionTAM"));

        if (snapshot.exists()) {
            datosTAM = [];
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                datosTAM.push({
                    id: childSnapshot.key,
                    Fecha: data.Fecha || 'Sin fecha',
                    Cedula: data.Cedula || 'N/A',
                    Modulo: data.Modulo || 'General',
                    RespuestasDinamicas: data.RespuestasDinamicas || []
                });
            });

            actualizarTarjetasKPI(datosTAM);
            renderizarFilas(datosTAM);
        } else {
            datosTAM = [];
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">Aún no hay evaluaciones de usabilidad registradas.</td></tr>';
            actualizarTarjetasKPI([]);
        }
    } catch (error) {
        console.error("Error cargando tabla TAM:", error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">Error de conexión con la base de datos.</td></tr>';
    }
};

const actualizarTarjetasKPI = (datos) => {
    const totalEncuestas = datos.length;
    const countTotalEl = document.getElementById('tam-count-total');

    if (countTotalEl) {
        countTotalEl.textContent = totalEncuestas;
    }
};

const renderizarFilas = (datosArray) => {
    const tbody = document.getElementById('tabla-tam-body');
    let html = '';

    if (datosArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">No se encontraron resultados para tu búsqueda.</td></tr>';
        return;
    }

    datosArray.forEach(data => {
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0; transition: background-color 0.2s;">
                <td style="padding: 15px;">${data.Fecha}</td>
                <td style="padding: 15px; font-weight: bold;">${data.Cedula}</td>
                <td style="padding: 15px;"><span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">${data.Modulo}</span></td>
                <td style="padding: 15px; text-align: center;">
                    <button class="btn-ver-reporte" data-id="${data.id}" style="background-color: #166534; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        <i class="fas fa-eye"></i> Ver Respuestas
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
};

// ==========================================
// LÓGICA PARA VER EL REPORTE EN MODAL
// ==========================================
document.addEventListener('click', (e) => {
    const target = e.target.closest('.btn-ver-reporte');
    if (!target) return;

    const idEncuesta = target.getAttribute('data-id');
    const encuesta = datosTAM.find(d => d.id === idEncuesta);
    if (!encuesta) return;

    document.getElementById('reporte-cedula').textContent = encuesta.Cedula;
    document.getElementById('reporte-modulo').textContent = encuesta.Modulo;
    document.getElementById('reporte-fecha').textContent = encuesta.Fecha;

    const contenedorRespuestas = document.getElementById('contenedor-reporte-respuestas');
    let htmlRespuestas = '';

    if (encuesta.RespuestasDinamicas && Array.isArray(encuesta.RespuestasDinamicas)) {
        encuesta.RespuestasDinamicas.forEach(cat => {
            htmlRespuestas += `<h3 style="color: #0f172a; margin-top: 15px; margin-bottom: 5px; font-size: 1.1em; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">${cat.Categoria}</h3>`;
            
            cat.Respuestas.forEach(resp => {
                htmlRespuestas += `
                    <div style="background: #f8fafc; padding: 10px; border-radius: 5px; border-left: 4px solid #004899; margin-bottom: 10px;">
                        <p style="margin: 0; font-size: 0.9em; font-weight: bold; color: #334155;">${resp.Pregunta}</p>
                        <p style="margin: 5px 0 0 0; color: #166534; font-weight: bold;">R: ${resp.RespuestaElegida}</p>
                    </div>
                `;
            });
        });
    } else {
        htmlRespuestas = '<p style="color: #64748b;">No hay detalle de respuestas para esta evaluación antigua.</p>';
    }

    contenedorRespuestas.innerHTML = htmlRespuestas;
    document.getElementById('modal-ver-respuestas').style.display = 'flex';
});

const cerrarReporte = () => document.getElementById('modal-ver-respuestas').style.display = 'none';
document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-cerrar-reporte-tam' || e.target.id === 'btn-ok-reporte') {
        cerrarReporte();
    }
});

const filtrarTabla = (termino) => {
    const resultadosFiltrados = datosTAM.filter(evaluacion => {
        return evaluacion.Cedula.toLowerCase().includes(termino) || 
               evaluacion.Modulo.toLowerCase().includes(termino);
    });
    renderizarFilas(resultadosFiltrados);
};