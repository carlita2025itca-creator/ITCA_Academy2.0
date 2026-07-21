import { db } from './firebase-config.js';
import { ref, get, child, push, set, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let logsGlobales = [];

// --- 1. FUNCIÓN PARA GUARDAR LA ACCIÓN SILENCIOSAMENTE ---
export async function registrarAccion(accion, modulo, detalle) {
    try {
        const sesionGuardada = localStorage.getItem('sesionITCA');
        let nombreAdmin = 'Desconocido';
        let rolAdmin = 'Desconocido';

        if (sesionGuardada) {
            const sesion = JSON.parse(sesionGuardada);
            const nombre = sesion.Nombre || sesion.nombre || '';
            const apellido = sesion.Apellido || sesion.apellido || '';
            const correo = sesion.Correo || sesion.correo || 'Sin correo';
            
            nombreAdmin = `${nombre} ${apellido} - ${correo}`.trim();
            rolAdmin = sesion.Rol || sesion.rol || 'Desconocido';
        }

        const log = {
            admin: nombreAdmin,      
            rol: rolAdmin,           
            accion: accion,          
            modulo: modulo,          
            detalle: detalle,        
            fecha: new Date().toISOString() 
        };

        const nuevaReferencia = push(ref(db, "historial"));
        await set(nuevaReferencia, log);
        
    } catch (error) {
        console.error("Error guardando el historial:", error);
    }
}
// --- 2. CARGAR NOMBRES DE MÓDULOS EN EL SELECTOR ---
async function cargarModulosParaFiltroHistorial() {
    const select = document.getElementById('filtro-modulo-historial');
    if (!select) return;

    try {
        const snapshot = await get(child(ref(db), "modulos"));
        
        // Empezamos solo con la opción general
        let opcionesHTML = `<option value="">Todos los módulos registrados</option>`;

        if (snapshot.exists()) {
            let modulosArray = [];
            snapshot.forEach(doc => {
                modulosArray.push(doc.val().nombre); // Extraemos solo los nombres
            });
            
            // Ordenamos alfabéticamente
            modulosArray.sort((a, b) => a.localeCompare(b));
            
            // Llenamos el selector únicamente con los nombres de los módulos
            modulosArray.forEach(nombreModulo => {
                opcionesHTML += `<option value="${nombreModulo.toLowerCase()}">${nombreModulo}</option>`;
            });
        }
        
        select.innerHTML = opcionesHTML;

    } catch (error) {
        console.error("Error cargando selector de módulos:", error);
        select.innerHTML = '<option value="">Error al cargar módulos</option>';
    }
}

// --- 3. FUNCIÓN PARA DESCARGAR LA TABLA DE HISTORIAL ---
export async function cargarTablaHistorial() {
    const tableBody = document.getElementById('history-table-body');
    if(!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Cargando historial...</td></tr>';

    try {
        // Cargamos las opciones del select en paralelo
        cargarModulosParaFiltroHistorial();

        const q = query(ref(db, "historial"), orderByChild("fecha"), limitToLast(100));
        const snapshot = await get(q);
        
        if(!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay registros en el historial.</td></tr>';
            logsGlobales = [];
            return;
        }

        const logsArray = [];
        snapshot.forEach(childSnapshot => {
            logsArray.push(childSnapshot.val());
        });
        
        logsArray.reverse(); 
        logsGlobales = logsArray; 
        
        renderizarTablaHistorial(logsGlobales);
        activarEscuchasDeFiltros();

    } catch (error) {
        console.error("Error cargando historial:", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Error al cargar el historial.</td></tr>';
    }
}

// --- 4. FUNCIÓN PARA DIBUJAR LA TABLA ---
function renderizarTablaHistorial(datos) {
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = '';

    if (datos.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">No se encontraron registros con esos filtros.</td></tr>';
        return;
    }

    datos.forEach(data => {
        const fechaLegible = new Date(data.fecha).toLocaleString('es-ES');
        
        let colorAccion = 'var(--text-muted)';
        if(data.accion === 'CREAR') colorAccion = 'var(--itca-green)';
        if(data.accion === 'ELIMINAR') colorAccion = 'var(--danger)';
        if(data.accion === 'EDITAR') colorAccion = 'var(--itca-blue)';
        if(data.accion === 'RESTABLECER') colorAccion = '#eab308'; 
        if(data.accion === 'EXPORTAR') colorAccion = '#10b981'; 

        const rolLimpio = (data.rol || '').replace('rol_', '').toUpperCase();

        tableBody.innerHTML += `
            <tr>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${fechaLegible}</td>
                <td><strong>${data.admin}</strong> <br><span style="font-size:0.75rem; color:var(--text-muted);">${rolLimpio}</span></td>
                <td><strong style="color: ${colorAccion};">${data.accion}</strong></td>
                <td>${data.modulo}</td>
                <td>${data.detalle}</td>
            </tr>
        `;
    });
}
// --- 5. LÓGICA DE LOS FILTROS FRONTEND ---
function activarEscuchasDeFiltros() {
    // 1. Limpiamos los eventos previos clonando los elementos
    const oldInputFecha = document.getElementById('filtro-fecha-historial');
    const oldSelectModulo = document.getElementById('filtro-modulo-historial');
    const oldBtnLimpiar = document.getElementById('btn-limpiar-historial');

    if (oldInputFecha) oldInputFecha.replaceWith(oldInputFecha.cloneNode(true));
    if (oldSelectModulo) oldSelectModulo.replaceWith(oldSelectModulo.cloneNode(true));
    if (oldBtnLimpiar) oldBtnLimpiar.replaceWith(oldBtnLimpiar.cloneNode(true));

    // 2. Capturamos los elementos NUEVOS que sí están funcionando en la pantalla
    const inputFecha = document.getElementById('filtro-fecha-historial');
    const selectModulo = document.getElementById('filtro-modulo-historial');
    const btnLimpiar = document.getElementById('btn-limpiar-historial');

    // 3. Función que aplica el filtro
    const aplicarFiltros = () => {
        // AHORA lee los valores exactos en el momento del clic
        const fechaElegida = inputFecha.value; 
        const moduloElegido = selectModulo.value.toLowerCase().trim();

        const datosFiltrados = logsGlobales.filter(log => {
            let pasaFecha = true;
            let pasaModulo = true;

            if (fechaElegida) {
                const fechaLog = log.fecha.split('T')[0]; 
                pasaFecha = (fechaLog === fechaElegida);
            }

            if (moduloElegido) {
                // Busca el nombre del módulo en el texto del detalle o en la sección
                const enSeccion = (log.modulo || '').toLowerCase().includes(moduloElegido);
                const enDetalle = (log.detalle || '').toLowerCase().includes(moduloElegido);
                pasaModulo = (enSeccion || enDetalle);
            }

            return pasaFecha && pasaModulo;
        });

        renderizarTablaHistorial(datosFiltrados);
    };

    // 4. Activamos los eventos en los controles reales
    if (inputFecha) inputFecha.addEventListener('change', aplicarFiltros);
    if (selectModulo) selectModulo.addEventListener('change', aplicarFiltros);
    
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            inputFecha.value = '';
            selectModulo.value = '';
            renderizarTablaHistorial(logsGlobales); 
        });
    }
}