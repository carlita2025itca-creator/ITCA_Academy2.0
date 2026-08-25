// 1. IMPORTACIONES CORREGIDAS PARA REALTIME DATABASE
import { db } from './firebase-config.js';
import { ref, get, child, set, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { registrarAccion } from './historial.js';

// 2. VARIABLES GLOBALES DEL MÓDULO
let todosLosUsuarios = []; // Guardará todos los usuarios para paginar súper rápido en la web
let usuariosFiltrados = [];
let paginaActual = 0; 
let rolesActualesFiltro = [];
let tablaActualId = '';
const LIMITE_POR_PAGINA = 10;
window.usuariosCargados = {}; 

// Función para encriptar la contraseña en SHA-256 (Igual que en Unity)
async function encriptarSHA256(mensaje) {
    const encoder = new TextEncoder();
    const data = encoder.encode(mensaje);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// FUNCIÓN PRINCIPAL: CARGAR LA TABLA CON PAGINACIÓN LOCAL
// ============================================================================
export async function cargarTablaUsuarios(rolesAFiltrar, tableBodyId, reset = true) {
    if (reset) {
        paginaActual = 0;
        rolesActualesFiltro = rolesAFiltrar;
        tablaActualId = tableBodyId;
    }

    const tableBody = document.getElementById(tablaActualId);
    if(!tableBody) return;

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const pageInfo = document.getElementById('page-info');
    
    if(btnPrev) btnPrev.disabled = true;
    if(btnNext) btnNext.disabled = true;

    try {
        // Si es la primera vez o forzamos reset, descargamos de la base de datos
        if (reset || todosLosUsuarios.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Cargando base de datos...</td></tr>`;
            const snapshot = await get(child(ref(db), "Usuarios")); // Asegúrate de que el nodo se llame "Usuarios"
            
            todosLosUsuarios = [];
            window.usuariosCargados = {};

            if (snapshot.exists()) {
                snapshot.forEach(doc => {
                    const data = doc.val();
                    // Normalizamos los datos por si Unity los guardó con Mayúsculas iniciales
                    const userObj = {
                        id: doc.key,
                        nombres: data.Nombre || data.nombres || '',
                        apellidos: data.Apellido || data.apellidos || '',
                        cedula: data.Cedula || data.cedula || doc.key,
                        correo: data.Correo || data.correo || '',
                        rol: data.Rol || data.rol || 'rol_usuario',
                        fechaRegistro: data.FechaRegistro || data.fechaRegistro || null
                    };
                    todosLosUsuarios.push(userObj);
                    window.usuariosCargados[userObj.id] = userObj;
                });
            }
        }

        // Filtramos por rol localmente
        usuariosFiltrados = todosLosUsuarios.filter(u => {
            const rolLimpio = u.rol.replace('rol_', '').toLowerCase();
            return rolesActualesFiltro.includes(rolLimpio) || rolesActualesFiltro.includes(u.rol);
        });

        // Paginamos
        const inicio = paginaActual * LIMITE_POR_PAGINA;
        const fin = inicio + LIMITE_POR_PAGINA;
        const usuariosPagina = usuariosFiltrados.slice(inicio, fin);

        tableBody.innerHTML = '';

        if (usuariosPagina.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No se encontraron registros.</td></tr>';
        } else {
            usuariosPagina.forEach((data) => {
                const nombreCompleto = `${data.nombres} ${data.apellidos}`.trim();
                const fechaMostrar = data.fechaRegistro ? new Date(data.fechaRegistro).toLocaleDateString() : '---';
                const rolMostrar = data.rol.replace('rol_', '').toUpperCase();

                tableBody.innerHTML += `
                    <tr>
                        <td><strong>${nombreCompleto}</strong></td>
                        <td>${data.cedula || 'N/A'}</td>
                        <td>${data.correo || 'Sin correo'}</td>
                        <td><span class="badge badge-${rolMostrar.toLowerCase()}">${rolMostrar}</span></td>
                        <td style="font-size: 0.85rem; color: #64748b;">${fechaMostrar}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-icon edit" title="Editar" onclick="abrirModalEditar('${data.id}')">✏️</button>
                                <button class="btn-icon reset" title="Restablecer Contraseña" onclick="restablecerPassword('${data.id}', '${data.nombres}')">🔑</button>
                                <button class="btn-icon delete" title="Eliminar" onclick="eliminarUsuario('${data.id}', '${data.nombres}')">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
        
        // Actualizar UI Paginación
        const totalPaginas = Math.ceil(usuariosFiltrados.length / LIMITE_POR_PAGINA);
        if(pageInfo) pageInfo.textContent = `Página ${paginaActual + 1} de ${totalPaginas === 0 ? 1 : totalPaginas}`;
        if(btnPrev) btnPrev.disabled = (paginaActual === 0);
        if(btnNext) btnNext.disabled = (paginaActual >= totalPaginas - 1);

    } catch (error) {
        console.error("Error cargando la tabla:", error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger);">Error al cargar los datos.</td></tr>';
    }
}

// ============================================================================
// INICIALIZADOR DE TODOS LOS EVENTOS DEL MÓDULO
// ============================================================================
export function initUsuariosModule() {
    
   // 🚀 --- ¡NUEVO! 0. LLAMADA INICIAL AL CARGAR EL MÓDULO ---
    // Esto enciende la tabla automáticamente apenas el administrador entra a la pantalla
    cargarTablaUsuarios(
        ['usuario', 'docente', 'admin', 'administrador', 'rol_usuario', 'rol_docente', 'rol_administrador'], 
        'users-table-body', 
        true
    );

    // --- 1. CONTROLES DE PAGINACIÓN ---
    document.getElementById('btn-prev')?.addEventListener('click', () => {
        if (paginaActual > 0) {
            paginaActual--;
            cargarTablaUsuarios(rolesActualesFiltro, tablaActualId, false); // Aquí sí va false para no perder el filtro
        }
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
        paginaActual++;
        cargarTablaUsuarios(rolesActualesFiltro, tablaActualId, false); // Aquí sí va false
    });

    // --- 2. MODAL Y FORMULARIO: AGREGAR USUARIO ---
    const modalAddUser = document.getElementById('modal-add-user');
    const formAddUser = document.getElementById('form-add-user');
    
    document.getElementById('btn-open-modal')?.addEventListener('click', () => modalAddUser.classList.add('active'));
    document.getElementById('close-modal')?.addEventListener('click', () => modalAddUser.classList.remove('active'));

   formAddUser?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSave = document.getElementById('btn-save-user');
        btnSave.textContent = 'Guardando...';
        btnSave.disabled = true;

        try {
            const nombres = document.getElementById('new-nombres').value.trim();
            const apellidos = document.getElementById('new-apellidos').value.trim();
            const cedula = document.getElementById('new-cedula').value.trim();
            const correo = document.getElementById('new-correo').value.trim().toLowerCase();
            const rol = document.getElementById('new-rol').value;

            // 1. VERIFICACIÓN DE DUPLICADOS EN LA BASE DE DATOS
            const usuariosRef = ref(db, 'Usuarios');
            const snapshot = await get(usuariosRef);

            if (snapshot.exists()) {
                let existeCedula = false;
                let existeCorreo = false;

                snapshot.forEach((childSnapshot) => {
                    const data = childSnapshot.val();
                    // Comparamos cédula y correo
                    if (data.Cedula === cedula) existeCedula = true;
                    if ((data.Correo || data.correo || '').toLowerCase() === correo) existeCorreo = true;
                });

                if (existeCedula) {
                    alert("⚠️ Error: Ya existe un usuario registrado con esta cédula.");
                    btnSave.disabled = false;
                    btnSave.textContent = 'Guardar Usuario';
                    return; // Detenemos la ejecución
                }
                if (existeCorreo) {
                    alert("⚠️ Error: Ya existe un usuario registrado con este correo electrónico.");
                    btnSave.disabled = false;
                    btnSave.textContent = 'Guardar Usuario';
                    return; // Detenemos la ejecución
                }
            }

            // 2. SI NO EXISTE, PROCEDEMOS A GUARDAR
            const passwordEncriptada = await encriptarSHA256(cedula);

            const nuevoUsuario = {
                Nombre: nombres,
                Apellido: apellidos,
                Cedula: cedula,
                Correo: correo,
                Rol: rol.startsWith('rol_') ? rol : `rol_${rol}`,
                Password: passwordEncriptada,
                FechaRegistro: new Date().toISOString()
            };

            await set(ref(db, `Usuarios/${cedula}`), nuevoUsuario);
            
            formAddUser.reset();
            modalAddUser.classList.remove('active');
            cargarTablaUsuarios(rolesActualesFiltro, tablaActualId, true);
            alert("Usuario agregado exitosamente.");
            registrarAccion('CREAR', 'Usuarios', `Registró un nuevo usuario con cédula: ${cedula}`);
            
        } catch (error) {
            console.error("Error al agregar usuario:", error);
            alert("Ocurrió un error al guardar en la base de datos.");
        } finally {
            btnSave.textContent = 'Guardar Usuario';
            btnSave.disabled = false;
        }
    });

    // --- 3. MODAL Y FORMULARIO: EDITAR USUARIO ---
    const modalEditUser = document.getElementById('modal-edit-user');
    const formEditUser = document.getElementById('form-edit-user');
    
    document.getElementById('close-edit-modal')?.addEventListener('click', () => modalEditUser.classList.remove('active'));

    formEditUser?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnUpdate = document.getElementById('btn-update-user');
        btnUpdate.textContent = 'Actualizando...';
        btnUpdate.disabled = true;

        try {
            const idDocumento = document.getElementById('edit-id').value;
            const rolSelect = document.getElementById('edit-rol').value;
            
            // Actualizamos en RTDB
            await update(ref(db, `Usuarios/${idDocumento}`), {
                Nombre: document.getElementById('edit-nombres').value.trim(),
                Apellido: document.getElementById('edit-apellidos').value.trim(),
                Cedula: document.getElementById('edit-cedula').value.trim(),
                Correo: document.getElementById('edit-correo').value.trim(),
                Rol: rolSelect.startsWith('rol_') ? rolSelect : `rol_${rolSelect}`
            });

            modalEditUser.classList.remove('active');
            cargarTablaUsuarios(rolesActualesFiltro, tablaActualId, true); // Forzamos true para recargar caché
            alert("Usuario actualizado correctamente.");
            registrarAccion('EDITAR', 'Usuarios', `Actualizó los datos de la cédula: ${document.getElementById('edit-cedula').value}`);
        } catch (error) {
            console.error("Error actualizando:", error);
            alert("Ocurrió un error al actualizar los datos.");
        } finally {
            btnUpdate.textContent = 'Actualizar Datos';
            btnUpdate.disabled = false;
        }
    });

    // Cerrar modales si se hace clic fuera de ellos
    window.addEventListener('click', (e) => { 
        if (e.target === modalAddUser) modalAddUser.classList.remove('active');
        if (e.target === modalEditUser) modalEditUser.classList.remove('active'); 
    });

    // --- 4. FILTROS Y BUSCADOR ---
    const filterRole = document.getElementById('filter-role');
    const searchCedula = document.getElementById('search-cedula');
    const btnClearSearch = document.getElementById('btn-clear-search');

    filterRole?.addEventListener('change', (e) => {
        const rol = e.target.value;
        // 🚀 ¡CORRECCIÓN AQUÍ! Cambiamos 'false' por 'true' para que el filtro limpie la página a 0 y aplique los nuevos roles
        if (rol === 'todos') {
            cargarTablaUsuarios(
                ['usuario', 'docente', 'admin', 'administrador', 'rol_usuario', 'rol_docente', 'rol_administrador'], 
                'users-table-body', 
                true
            );
        } else {
            cargarTablaUsuarios([rol, `rol_${rol}`], 'users-table-body', true);
        }
    });

    document.getElementById('btn-search')?.addEventListener('click', () => {
        const cedula = searchCedula.value.trim().toLowerCase();
        if (cedula !== '') {
            btnClearSearch.style.display = 'inline-block';
            
            // Búsqueda local en caché (súper rápido)
            const resultado = todosLosUsuarios.filter(u => u.cedula.toLowerCase().includes(cedula));
            
            const tableBody = document.getElementById('users-table-body');
            tableBody.innerHTML = '';
            
            if(resultado.length === 0) {
                return tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No se encontró usuario con esa cédula.</td></tr>';
            }

            resultado.forEach(data => {
                const nombreCompleto = `${data.nombres} ${data.apellidos}`.trim();
                const rolMostrar = data.rol.replace('rol_', '').toUpperCase();
                
                tableBody.innerHTML += `
                    <tr>
                        <td><strong>${nombreCompleto}</strong></td>
                        <td>${data.cedula}</td>
                        <td>${data.correo}</td>
                        <td><span class="badge badge-${rolMostrar.toLowerCase()}">${rolMostrar}</span></td>
                        <td>---</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-icon edit" title="Editar Usuario" onclick="abrirModalEditar('${data.id}')">✏️</button>
                                <button class="btn-icon reset" title="Restablecer Contraseña" onclick="restablecerPassword('${data.id}', '${data.nombres}')">🔑</button>
                                <button class="btn-icon delete" title="Eliminar Usuario" onclick="eliminarUsuario('${data.id}', '${data.nombres}')">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            document.getElementById('btn-prev').disabled = true;
            document.getElementById('btn-next').disabled = true;
            document.getElementById('page-info').textContent = 'Resultado de Búsqueda';
        }
    });

    btnClearSearch?.addEventListener('click', () => {
        searchCedula.value = '';
        btnClearSearch.style.display = 'none';
        cargarTablaUsuarios(rolesActualesFiltro, tablaActualId, false);
    });

    // --- 5. FUNCIONES GLOBALES (ACCIONES DE LA TABLA) ---
    window.abrirModalEditar = function(idDocumento) {
        const datos = window.usuariosCargados[idDocumento];
        if(!datos) return;

        document.getElementById('edit-id').value = idDocumento;
        document.getElementById('edit-nombres').value = datos.nombres || '';
        document.getElementById('edit-apellidos').value = datos.apellidos || '';
        document.getElementById('edit-cedula').value = datos.cedula || '';
        document.getElementById('edit-correo').value = datos.correo || '';
        
        const rolLimpio = datos.rol.replace('rol_', '');
        document.getElementById('edit-rol').value = rolLimpio || 'usuario';

        document.getElementById('modal-edit-user').classList.add('active');
    };

    window.eliminarUsuario = async function(idDocumento, nombre) {
        if(confirm(`¿Estás seguro de eliminar a ${nombre}? Esta acción es irreversible.`)) {
            try {
                await remove(ref(db, `Usuarios/${idDocumento}`));
                alert("Usuario eliminado exitosamente.");
                registrarAccion('ELIMINAR', 'Usuarios', `Eliminó del sistema al usuario: ${nombre} (${idDocumento})`);
                cargarTablaUsuarios(rolesActualesFiltro, tablaActualId, true);
            } catch (error) {
                console.error("Error al eliminar:", error);
                alert("Error al eliminar el registro.");
            }
        }
    };

    window.restablecerPassword = async function(idDocumento, nombre) {
        if(confirm(`¿Deseas restablecer la contraseña de ${nombre}? Su nueva contraseña pasará a ser su número de cédula.`)) {
            try {
                // Encriptamos la misma cédula para usarla de contraseña
                const nuevaPasswordEncriptada = await encriptarSHA256(idDocumento);
                
                await update(ref(db, `Usuarios/${idDocumento}`), {
                    Password: nuevaPasswordEncriptada
                });
                
                alert(`Contraseña de ${nombre} restablecida con éxito. La nueva clave es: ${idDocumento}`);
                registrarAccion('EDITAR', 'Usuarios', `Restableció la contraseña del usuario: ${idDocumento}`);
            } catch (error) {
                console.error("Error restableciendo clave:", error);
                alert("Hubo un error al intentar restablecer la contraseña.");
            }
        }
    };
}

// ==========================================
// EXPORTAR USUARIOS VISIBLES A EXCEL
// ==========================================
window.exportarUsuariosExcel = () => {
    const filasTabla = document.querySelectorAll('#users-table-body tr');
    const datosParaExcel = [];

    filasTabla.forEach(fila => {
        if (fila.style.display === 'none' || fila.cells.length <= 1) return;

        datosParaExcel.push({
            "Nombre Completo": fila.cells[0].innerText.trim(),
            "Identificación": fila.cells[1].innerText.trim(),
            "Correo Electrónico": fila.cells[2].innerText.trim(),
            "Rol Asignado": fila.cells[3].innerText.trim(),
            "Fecha de Registro": fila.cells[4].innerText.trim()
        });
    });

    if (datosParaExcel.length === 0) {
        alert("No hay registros visibles en la tabla para exportar. Verifica tus filtros.");
        return;
    }

    try {
        const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Usuarios Filtrados");

        const fechaHoy = new Date().toLocaleDateString().replace(/\//g, '-');
        XLSX.writeFile(libro, `Usuarios_ITCA_Filtrados_${fechaHoy}.xlsx`);

        import('./historial.js').then(m => {
            m.registrarAccion('EXPORTAR', 'Usuarios', `Descargó Excel con ${datosParaExcel.length} usuarios filtrados.`);
        });

    } catch (error) {
        console.error("Error al generar Excel:", error);
        alert("Hubo un error al intentar crear el archivo.");
    }
};