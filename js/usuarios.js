// 1. IMPORTACIONES
import { db } from './firebase-config.js';
import { ref, get, child, set, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { registrarAccion } from './historial.js';

// 2. VARIABLES GLOBALES DEL MÓDULO
let todosLosUsuarios = []; 
let usuariosFiltrados = [];
let paginaActual = 0; 
let rolesActualesFiltro = [];
let tablaActualId = '';
const LIMITE_POR_PAGINA = 10;
window.usuariosCargados = {}; 

// ============================================================================
// FUNCIONES UTILITARIAS Y DE VALIDACIÓN
// ============================================================================

// Encriptar la contraseña en SHA-256 (Igual que en Unity)
async function encriptarSHA256(mensaje) {
    const encoder = new TextEncoder();
    const data = encoder.encode(mensaje);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validar formato de Cédula Ecuatoriana (10 dígitos)
function esCedulaValida(cedula) {
    const regex = /^[0-9]{10}$/;
    return regex.test(cedula);
}

// Validar formato de Correo Electrónico
function esCorreoValido(correo) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo);
}

// Capitalizar nombres (ej. "juan pérez" -> "Juan Pérez")
function formatearNombreCompleto(texto) {
    return texto.trim().split(' ').map(palabra => 
        palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase()
    ).join(' ');
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
        if (reset || todosLosUsuarios.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Cargando registros desde la base de datos...</td></tr>`;
            const snapshot = await get(child(ref(db), "Usuarios")); 
            
            todosLosUsuarios = [];
            window.usuariosCargados = {};

            if (snapshot.exists()) {
                snapshot.forEach(doc => {
                    const data = doc.val();
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
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No se encontraron registros.</td></tr>';
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
        console.error("Error al cargar la tabla de usuarios:", error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger);">Ocurrió un error de conexión al cargar los datos.</td></tr>';
    }
}

// ============================================================================
// INICIALIZADOR DE TODOS LOS EVENTOS DEL MÓDULO
// ============================================================================
export function initUsuariosModule() {
    
    // Llamada inicial
    cargarTablaUsuarios(
        ['usuario', 'docente', 'admin', 'administrador', 'rol_usuario', 'rol_docente', 'rol_administrador'], 
        'users-table-body', 
        true
    );

    // --- 1. CONTROLES DE PAGINACIÓN ---
    document.getElementById('btn-prev')?.addEventListener('click', () => {
        if (paginaActual > 0) {
            paginaActual--;
            cargarTablaUsuarios(rolesActualesFiltro, tablaActualId, false); 
        }
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
        paginaActual++;
        cargarTablaUsuarios(rolesActualesFiltro, tablaActualId, false); 
    });

    // --- 2. MODAL Y FORMULARIO: AGREGAR USUARIO ---
    const modalAddUser = document.getElementById('modal-add-user');
    const formAddUser = document.getElementById('form-add-user');
    
    document.getElementById('btn-open-modal')?.addEventListener('click', () => modalAddUser.classList.add('active'));
    document.getElementById('close-modal')?.addEventListener('click', () => modalAddUser.classList.remove('active'));

   formAddUser?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSave = document.getElementById('btn-save-user');

        try {
            // Captura y normalización de datos
            const nombres = formatearNombreCompleto(document.getElementById('new-nombres').value);
            const apellidos = formatearNombreCompleto(document.getElementById('new-apellidos').value);
            const cedula = document.getElementById('new-cedula').value.trim();
            const correo = document.getElementById('new-correo').value.trim().toLowerCase();
            const rol = document.getElementById('new-rol').value;

            // Validaciones Estrictas
            if (!esCedulaValida(cedula)) {
                return Swal.fire('Formato Inválido', 'La cédula debe contener exactamente 10 dígitos numéricos.', 'warning');
            }
            if (!esCorreoValido(correo)) {
                return Swal.fire('Formato Inválido', 'Por favor ingresa un correo electrónico válido.', 'warning');
            }

            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btnSave.disabled = true;

            // 1. VERIFICACIÓN DE DUPLICADOS
            const snapshot = await get(ref(db, 'Usuarios'));

            if (snapshot.exists()) {
                let existeCedula = false;
                let existeCorreo = false;

                snapshot.forEach((childSnapshot) => {
                    const data = childSnapshot.val();
                    if (data.Cedula === cedula) existeCedula = true;
                    if ((data.Correo || '').toLowerCase() === correo) existeCorreo = true;
                });

                if (existeCedula) {
                    btnSave.disabled = false;
                    btnSave.textContent = 'Guardar Usuario';
                    return Swal.fire('Conflicto de Datos', 'Ya existe un usuario registrado con esta cédula.', 'error');
                }
                if (existeCorreo) {
                    btnSave.disabled = false;
                    btnSave.textContent = 'Guardar Usuario';
                    return Swal.fire('Conflicto de Datos', 'Ya existe un usuario registrado con este correo electrónico.', 'error');
                }
            }

            // 2. PROCEDEMOS A GUARDAR
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
            
            Swal.fire('¡Éxito!', 'Usuario agregado correctamente a la plataforma.', 'success');
            registrarAccion('CREAR', 'Usuarios', `Registró un nuevo usuario con cédula: ${cedula}`);
            
        } catch (error) {
            console.error("Error al agregar usuario:", error);
            Swal.fire('Error del Servidor', 'No se pudo guardar el registro en la base de datos.', 'error');
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

        try {
            const idDocumento = document.getElementById('edit-id').value;
            const cedula = document.getElementById('edit-cedula').value.trim();
            const correo = document.getElementById('edit-correo').value.trim().toLowerCase();
            const rolSelect = document.getElementById('edit-rol').value;

            // Validaciones Estrictas
            if (!esCedulaValida(cedula)) {
                return Swal.fire('Formato Inválido', 'La cédula debe contener exactamente 10 dígitos numéricos.', 'warning');
            }
            if (!esCorreoValido(correo)) {
                return Swal.fire('Formato Inválido', 'Por favor ingresa un correo electrónico válido.', 'warning');
            }

            btnUpdate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            btnUpdate.disabled = true;

            await update(ref(db, `Usuarios/${idDocumento}`), {
                Nombre: formatearNombreCompleto(document.getElementById('edit-nombres').value),
                Apellido: formatearNombreCompleto(document.getElementById('edit-apellidos').value),
                Cedula: cedula,
                Correo: correo,
                Rol: rolSelect.startsWith('rol_') ? rolSelect : `rol_${rolSelect}`
            });

            modalEditUser.classList.remove('active');
            cargarTablaUsuarios(rolesActualesFiltro, tablaActualId, true); 
            
            Swal.fire('¡Actualizado!', 'Los datos del usuario se modificaron con éxito.', 'success');
            registrarAccion('EDITAR', 'Usuarios', `Actualizó los datos de la cédula: ${cedula}`);
            
        } catch (error) {
            console.error("Error actualizando usuario:", error);
            Swal.fire('Error del Servidor', 'No se pudo actualizar el registro.', 'error');
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
        const cedulaBuscada = searchCedula.value.trim().toLowerCase();
        if (cedulaBuscada !== '') {
            btnClearSearch.style.display = 'inline-block';
            
            const resultado = todosLosUsuarios.filter(u => u.cedula.toLowerCase().includes(cedulaBuscada));
            const tableBody = document.getElementById('users-table-body');
            tableBody.innerHTML = '';
            
            if(resultado.length === 0) {
                return tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No se encontró ningún registro que coincida con esa búsqueda.</td></tr>';
            }

            resultado.forEach(data => {
                const nombreCompleto = `${data.nombres} ${data.apellidos}`.trim();
                const rolMostrar = data.rol.replace('rol_', '').toUpperCase();
                const fechaMostrar = data.fechaRegistro ? new Date(data.fechaRegistro).toLocaleDateString() : '---';
                
                tableBody.innerHTML += `
                    <tr>
                        <td><strong>${nombreCompleto}</strong></td>
                        <td>${data.cedula}</td>
                        <td>${data.correo}</td>
                        <td><span class="badge badge-${rolMostrar.toLowerCase()}">${rolMostrar}</span></td>
                        <td style="font-size: 0.85rem; color: #64748b;">${fechaMostrar}</td>
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
        const confirmacion = await Swal.fire({
            title: '¿Confirmar Eliminación?',
            html: `Estás a punto de eliminar del sistema al usuario <b>${nombre}</b>.<br><br>Esta acción es permanente y no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if(confirmacion.isConfirmed) {
            Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
            try {
                await remove(ref(db, `Usuarios/${idDocumento}`));
                Swal.fire('¡Eliminado!', 'El registro fue borrado exitosamente.', 'success');
                registrarAccion('ELIMINAR', 'Usuarios', `Eliminó del sistema al usuario: ${nombre} (${idDocumento})`);
                cargarTablaUsuarios(rolesActualesFiltro, tablaActualId, true);
            } catch (error) {
                console.error("Error al eliminar registro:", error);
                Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
            }
        }
    };

    window.restablecerPassword = async function(idDocumento, nombre) {
        const confirmacion = await Swal.fire({
            title: 'Restablecer Contraseña',
            html: `¿Confirmas restablecer los accesos para <b>${nombre}</b>?<br>Su nueva contraseña será su número de cédula.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0284c7',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, restablecer',
            cancelButtonText: 'Cancelar'
        });

        if(confirmacion.isConfirmed) {
            Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
            try {
                const nuevaPasswordEncriptada = await encriptarSHA256(idDocumento);
                await update(ref(db, `Usuarios/${idDocumento}`), {
                    Password: nuevaPasswordEncriptada
                });
                
                Swal.fire('¡Contraseña Actualizada!', `Los accesos fueron restablecidos.<br>Nueva clave: <b>${idDocumento}</b>`, 'success');
                registrarAccion('EDITAR', 'Usuarios', `Restableció la contraseña del usuario: ${idDocumento}`);
            } catch (error) {
                console.error("Error al restablecer contraseña:", error);
                Swal.fire('Error', 'Hubo un error al intentar cambiar la contraseña.', 'error');
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
        return Swal.fire('Exportación Vacía', 'No hay registros visibles en la tabla para exportar. Verifica tus filtros.', 'info');
    }

    try {
        const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Usuarios Filtrados");

        const fechaHoy = new Date().toLocaleDateString().replace(/\//g, '-');
        XLSX.writeFile(libro, `Reporte_Usuarios_ITCA_${fechaHoy}.xlsx`);

        import('./historial.js').then(m => {
            m.registrarAccion('EXPORTAR', 'Usuarios', `Descargó reporte Excel con ${datosParaExcel.length} registros de usuarios.`);
        });

    } catch (error) {
        console.error("Error durante exportación a Excel:", error);
        Swal.fire('Error', 'No se pudo generar el archivo Excel.', 'error');
    }
};