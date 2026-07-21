import { db } from './firebase-config.js';
// 1. IMPORTACIONES CORREGIDAS PARA REALTIME DATABASE
import { ref, get, child, set, push, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { registrarAccion } from './historial.js';

export async function cargarTablaModulos() {
    const tableBody = document.getElementById('modules-table-body');
    if (!tableBody) return;

    // Validación de seguridad de sesión asegurando que no haya espacios
    const rolActual = (window.rolUsuarioActual || localStorage.getItem('rol') || '').toLowerCase().trim();
    const correoActual = (window.correoUsuarioActual || localStorage.getItem('correo') || '').toLowerCase().trim();

    if (!rolActual) {

        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Esperando autenticación...</td></tr>';
        return;
    }


    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Cargando módulos...</td></tr>';

    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, "modulos"));

        let modulosArray = [];
        let totalModulos = 0;

        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const data = childSnapshot.val();

                // ==============================================
                // 2. ENCENDEMOS LOS BOTONES SOLO SI ES ROL_ADMINISTRADOR
                // ==============================================
                const esAdmin = (rolActual === 'rol_administrador');

                const btnAdd = document.getElementById('btn-add-module');
                const btnExportar = document.getElementById('btn-exportar-modulos');

                if (esAdmin) {
                    if (btnAdd) btnAdd.style.display = 'inline-block';
                    if (btnExportar) btnExportar.style.display = 'inline-block';
                }

                // Limpiamos los correos de espacios extra para que coincidan exactamente
                const correoModulo = (data.docenteAsignado || '').toLowerCase().trim();
                const esDocenteAsignado = (correoModulo !== '' && correoActual !== '' && correoModulo === correoActual);

                if (esAdmin || esDocenteAsignado) {
                    modulosArray.push({ id: childSnapshot.key, ...data });
                    totalModulos++;
                }
            });
        }

        const contadorGlobal = document.getElementById('modulo-global-counter');
        if (contadorGlobal) {
            contadorGlobal.innerText = `Total: ${totalModulos} | Siguiente: MOD${(totalModulos + 1).toString().padStart(3, '0')}`;
        }

        // Si no hay módulos para este usuario
        if (modulosArray.length === 0) {
            // 👇 Cambiar a colspan="5"
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">No tienes módulos asignados actualmente.</td></tr>';
            return;
        }

        modulosArray.sort((a, b) => a.nombre.localeCompare(b.nombre));
        tableBody.innerHTML = '';

        modulosArray.forEach(data => {
            const id = data.id;

            let descripcionMuestra = data.descripcion
                ? data.descripcion
                : '<em style="color: #94a3b8;">Sin descripción asignada</em>';

            if (data.descripcion && data.descripcion.length > 60) {
                descripcionMuestra = data.descripcion.substring(0, 60) + '...';
            }

            // =========================================================
            // LÓGICA DE BOTONES BASADA EN ROLES
            // =========================================================
            const botonPreguntas = `
                <a href="#" onclick="abrirGestionPreguntas('${id}', '${data.nombre}', '${data.moduloId}')">
                    <i class="fas fa-question-circle"></i> Preguntas
                </a>
            `;

            const botonesAdminExtra = `
                <a href="#" onclick="abrirModalEditarModulo('${id}', '${data.moduloId}', '${data.nombre}')">
                    <i class="fas fa-edit"></i> Editar
                </a>
                <a href="#" onclick="eliminarModulo('${id}', '${data.nombre}', '${data.moduloId}')" class="action-danger">
                    <i class="fas fa-trash"></i> Eliminar
                </a>
            `;

            const esAdmin = (rolActual === 'superadmin' || rolActual === 'admin' || rolActual === 'rol_administrador');
            const menuDropdown = esAdmin ? (botonPreguntas + botonesAdminExtra) : botonPreguntas;
            // =========================================================

            const cantidadEvaluacion = data.cantidadPreguntas || 10;

            tableBody.innerHTML += `
                <tr>
                    <td><span class="mod-id-tag">${data.moduloId || id}</span></td>
                    <td>
                        <div style="font-size: 1rem; color: #1e293b; font-weight: 600;">${data.nombre}</div>
                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">${descripcionMuestra}</div>
                        <div style="font-size: 0.8rem; color: #0284c7; margin-top: 4px;"><i class="fas fa-user-tie"></i> Docente: ${data.docenteAsignado || 'Sin asignar'}</div>
                        <div style="font-size: 0.8rem; color: #16a34a; margin-top: 4px;"><i class="fas fa-tag"></i> Categoría: ${data.categoria || 'General'}</div>
                    </td>
                    
                    <td style="text-align: center;">
                        <span style="background-color: #f1f5f9; color: #334155; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; border: 1px solid #cbd5e1;">
                            <i class="fas fa-list-ol" style="color: #475569; margin-right: 4px;"></i> ${cantidadEvaluacion} Preguntas
                        </span>
                    </td>
                    <td><span class="tag-active">Activo</span></td>
                    <td style="text-align: right;">
                        <div class="dropdown-container">
                            <button class="btn-opciones-main" onclick="toggleOpcionesModulo('drop-${id}')">
                                Opciones <i class="fas fa-chevron-down"></i>
                            </button>
                            <div id="drop-${id}" class="dropdown-menu">
                                ${menuDropdown}
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error al cargar módulos:", error);
    }
}

window.abrirGestionCertificados = (id, nombre) => {
    console.log(`Abriendo certificados para: ${nombre}`);
    alert(`Mostrando lista de estudiantes aprobados en: ${nombre}`);
};

export function initModulosModule() {
    // ==========================================
    // CONTROL DE ACCESO POR ROLES (Docente)
    // ==========================================
    const rolUsuario = (window.rolUsuarioActual || localStorage.getItem('rol') || '').toLowerCase().trim();

    // Capturamos AMBOS botones
    const btnAdd = document.getElementById('btn-add-module');
    const btnExportar = document.querySelector('button[onclick="exportarModulosExcel()"]');

    // Si el rol es exactamente 'rol_docente', ocultamos ambos sin excepciones
    if (rolUsuario === 'rol_docente' || rolUsuario === 'docente') {
        if (btnAdd) {
            btnAdd.style.cssText = 'display: none !important;';
        }
        if (btnExportar) {
            btnExportar.style.cssText = 'display: none !important;';
        }
    }

    const modal = document.getElementById('modal-module');
    const btnCancel = document.getElementById('btn-cancel-mod');
    const closeX = document.getElementById('close-module-modal');
    const form = document.getElementById('form-add-module');

    configurarModalEdicion();
    cargarTablaModulos();

    // ABRIR MODAL DE NUEVO MÓDULO
    if (btnAdd) {
        btnAdd.addEventListener('click', async () => {
            modal.classList.add('active');

            cargarDocentesSelect('mod-docente');
            cargarCategoriasSelect('mod-categoria');

            try {
                const snapshot = await get(child(ref(db), "modulos"));
                let maxId = 0;
                let totalModulos = 0; // ✅ CORRECCIÓN 2: Definimos un contador local

                if (snapshot.exists()) {
                    snapshot.forEach(doc => {
                        totalModulos++;
                        const idActual = doc.key;
                        const numero = parseInt(idActual.replace('MOD', ''), 10);
                        if (!isNaN(numero) && numero > maxId) {
                            maxId = numero;
                        }
                    });
                }

                const badge = document.getElementById('modulo-counter-badge');
                if (badge) {
                    badge.innerText = `Total actual: ${totalModulos} | Siguiente: MOD${(maxId + 1).toString().padStart(3, '0')}`;
                }
            } catch (error) {
                console.error("Error al obtener el conteo:", error);
            }
        });
    }

    // CERRAR MODAL
    const cerrar = () => {
        modal.classList.remove('active');
        form.reset();
    };
    if (btnCancel) btnCancel.addEventListener('click', cerrar);
    if (closeX) closeX.addEventListener('click', cerrar);

    // ==========================================
    // BUSCADOR EN VIVO DE MÓDULOS
    // ==========================================
    const searchInput = document.getElementById('search-module');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const terminoBusqueda = this.value.toLowerCase();
            const filasTabla = document.querySelectorAll('#modules-table-body tr');

            filasTabla.forEach(fila => {
                if (fila.cells.length <= 1) return;

                const idModulo = fila.cells[0].textContent.toLowerCase();
                const nombreModulo = fila.cells[1].textContent.toLowerCase();

                if (idModulo.includes(terminoBusqueda) || nombreModulo.includes(terminoBusqueda)) {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            });
        });
    }

    // ==========================================
    // GUARDAR EN FIREBASE (NUEVO MÓDULO)
    // ==========================================
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btnSubmit = form.querySelector('.btn-save');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            const nombreIngresado = document.getElementById('mod-nombre').value.trim();
            const descripcionIngresada = document.getElementById('mod-desc').value.trim();
            const docenteSeleccionado = document.getElementById('mod-docente').value;
            const categoriaSeleccionada = document.getElementById('mod-categoria').value;
            const cantidadPreguntas = parseInt(document.getElementById('mod-cantidad-preguntas').value) || 10;
            const evalPre = document.getElementById('mod-eval-pre').checked;
            const evalPost = document.getElementById('mod-eval-post').checked;
            const evalTam = document.getElementById('mod-eval-tam').checked;
            try {
                const snapshot = await get(child(ref(db), "modulos"));
                let maxId = 0;
                let existeNombre = false;

                if (snapshot.exists()) {
                    snapshot.forEach(doc => {
                        const idActual = doc.key;
                        const numero = parseInt(idActual.replace('MOD', ''), 10);
                        if (!isNaN(numero) && numero > maxId) {
                            maxId = numero;
                        }

                        if (doc.val().nombre.toLowerCase() === nombreIngresado.toLowerCase()) {
                            existeNombre = true;
                        }
                    });
                }

                if (existeNombre) {
                    alert(`⚠️ Error: Ya existe un módulo llamado "${nombreIngresado}". Por favor, elige un nombre diferente.`);
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = "Guardar Módulo";
                    return;
                }

                const nuevoNumero = maxId + 1;
                const moduloIdGenerado = "MOD" + nuevoNumero.toString().padStart(3, '0');

                const nuevoModulo = {
                    moduloId: moduloIdGenerado,
                    nombre: nombreIngresado,
                    descripcion: descripcionIngresada,
                    fechaCreacion: new Date().toISOString(),
                    docenteAsignado: docenteSeleccionado,
                    categoria: categoriaSeleccionada,
                    cantidadPreguntas: cantidadPreguntas,
                    evaluaciones: {
                        pre: evalPre,
                        post: evalPost,
                        tam: evalTam
                    }

                };

                const referenciaEspecifica = ref(db, `modulos/${moduloIdGenerado}`);
                await set(referenciaEspecifica, nuevoModulo);

                alert(`¡Módulo creado exitosamente con el ID: ${moduloIdGenerado}!`);

                try {
                    const historialModule = await import('./historial.js');
                    historialModule.registrarAccion('CREAR', 'Módulos', `Creó el módulo: ${nuevoModulo.nombre} (${moduloIdGenerado})`);
                } catch (e) { console.warn("No se pudo registrar historial", e) }

                cerrar();
                cargarTablaModulos();

            } catch (error) {
                console.error("Error al guardar módulo:", error);
                alert("Error al guardar en la base de datos.");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = "Guardar Módulo";
            }
        });
    }

    // ==========================================
    // GUARDAR NUEVA CATEGORÍA DE MÓDULO (Movido aquí por seguridad)
    // ==========================================
    const formAddCategoria = document.getElementById('form-add-categoria');
    if (formAddCategoria) {
        formAddCategoria.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombreCat = document.getElementById('cat-nombre').value.trim();

            try {
                const nuevaCatRef = push(ref(db, 'categorias_modulos'));
                await set(nuevaCatRef, { nombre: nombreCat });
                alert("Categoría guardada con éxito.");
                window.cerrarModalCategoria();

                cargarCategoriasSelect('mod-categoria');
                cargarCategoriasSelect('edit-mod-categoria');
            } catch (error) {
                console.error("Error:", error);
                alert("Error al guardar la categoría.");
            }
        });
    }
}
// ==========================================
// FUNCIÓN PARA CARGAR DOCENTES EN SELECTORES
// ==========================================
async function cargarDocentesSelect(selectId, docenteAsignado = "") {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Cargando docentes...</option>';

    try {
        const snapshot = await get(child(ref(db), "Usuarios"));
        select.innerHTML = '<option value="">Seleccione un docente...</option>';

        if (snapshot.exists()) {
            snapshot.forEach(doc => {
                const data = doc.val();
                const rol = (data.Rol || data.rol || '').toLowerCase();

                if (rol === 'docente' || rol === 'rol_docente') {
                    const correo = data.Correo || data.correo;

                    // Buscamos en plural y singular, mayúsculas y minúsculas
                    const nombre = data.Nombres || data.nombres || data.Nombre || data.nombre || '';
                    const apellido = data.Apellidos || data.apellidos || data.Apellido || data.apellido || '';

                    let nombreCompleto = `${nombre} ${apellido}`.trim();

                    // Si la base de datos no tiene nombre/apellido, usamos el correo de respaldo
                    if (nombreCompleto === "") {
                        nombreCompleto = correo;
                    }

                    const selected = (correo.toLowerCase() === docenteAsignado.toLowerCase()) ? 'selected' : '';
                    select.innerHTML += `<option value="${correo}" ${selected}>${nombreCompleto}</option>`;
                }
            });
        }
    } catch (error) {
        console.error("Error al cargar docentes:", error);
        select.innerHTML = '<option value="">Error al cargar</option>';
    }
}
// ==========================================
// FUNCIÓN PARA ELIMINAR MÓDULO Y SUS PREGUNTAS (EN CASCADA)
// ==========================================
window.eliminarModulo = async (idDocumento, nombreModulo, idTecnico) => {
    const confirmacion = confirm(`⚠️ PELIGRO DE BORRADO ⚠️\n\n¿Estás segura de que deseas eliminar el módulo "${nombreModulo}"?\n\n¡ATENCIÓN! Esto también borrará para siempre TODAS las preguntas asociadas a este módulo. Esta acción no se puede deshacer.`);

    if (confirmacion) {
        try {
            // 4. BUSCAR PREGUNTAS ASOCIADAS PARA BORRARLAS
            const snapshotPreguntas = await get(child(ref(db), "preguntas"));
            let preguntasBorradas = 0;

            if (snapshotPreguntas.exists()) {
                const promesasBorrado = [];
                snapshotPreguntas.forEach(docPregunta => {
                    if (docPregunta.val().moduloId === idTecnico) {
                        promesasBorrado.push(remove(ref(db, `preguntas/${docPregunta.key}`)));
                        preguntasBorradas++;
                    }
                });
                await Promise.all(promesasBorrado); // Ejecuta todos los borrados a la vez
            }

            // 5. BORRAR EL MÓDULO PRINCIPAL (usando el ID técnico como llave)
            await remove(ref(db, `modulos/${idTecnico}`));

            alert(`✅ Eliminación exitosa.\n- Módulo eliminado: 1\n- Preguntas eliminadas: ${preguntasBorradas}`);

            import('./historial.js').then(module => {
                module.registrarAccion('ELIMINAR', 'Módulos', `Eliminó el módulo: ${nombreModulo} y ${preguntasBorradas} preguntas asociadas.`);
            });

            cargarTablaModulos();

        } catch (error) {
            console.error("Error al eliminar el módulo y sus preguntas:", error);
            alert("Hubo un error al intentar eliminar los datos.");
        }
    }
};

// ==========================================
// FUNCIONES PARA EDITAR MÓDULO
// ==========================================
window.abrirModalEditarModulo = async (idDocumento, idTecnico, nombreModulo) => {
    const modalEdit = document.getElementById('modal-edit-module');

    try {
        const snapshot = await get(child(ref(db), `modulos/${idDocumento}`));
        if (snapshot.exists()) {
            const data = snapshot.val();

            document.getElementById('edit-mod-doc-id').value = idDocumento;
            document.getElementById('edit-mod-id-visible').value = idTecnico;
            document.getElementById('edit-mod-nombre').value = data.nombre;
            document.getElementById('edit-mod-desc').value = data.descripcion || '';
            document.getElementById('edit-mod-cantidad-preguntas').value = data.cantidadPreguntas || 10;
            // 👇 3. AGREGA ESTO AQUÍ: Llenar los checkboxes en la edición
            if (data.evaluaciones) {
                document.getElementById('edit-mod-eval-pre').checked = data.evaluaciones.pre || false;
                document.getElementById('edit-mod-eval-post').checked = data.evaluaciones.post || false;
                document.getElementById('edit-mod-eval-tam').checked = data.evaluaciones.tam || false;
            } else {
                document.getElementById('edit-mod-eval-pre').checked = false;
                document.getElementById('edit-mod-eval-post').checked = false;
                document.getElementById('edit-mod-eval-tam').checked = false;
            }
            // <--- AGREGA ESTA LÍNEA AQUÍ (Pasa el correo del docente guardado)
            cargarDocentesSelect('edit-mod-docente', data.docenteAsignado || "");
            cargarCategoriasSelect('edit-mod-categoria', data.categoria || "");

            modalEdit.classList.add('active');
        }
    } catch (error) {
        console.error("Error al cargar datos para editar:", error);
    }
};

export function configurarModalEdicion() {
    const modalEdit = document.getElementById('modal-edit-module');
    const formEdit = document.getElementById('form-edit-module');
    const btnCancel = document.getElementById('btn-cancel-edit-mod');
    const closeX = document.getElementById('close-edit-module-modal');

    const cerrarEdit = () => {
        modalEdit.classList.remove('active');
        formEdit.reset();
    };

    btnCancel.addEventListener('click', cerrarEdit);
    closeX.addEventListener('click', cerrarEdit);

    formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idDocumento = document.getElementById('edit-mod-doc-id').value;
        const nombreNuevo = document.getElementById('edit-mod-nombre').value.trim();
        const descNueva = document.getElementById('edit-mod-desc').value.trim();
        const idTecnico = document.getElementById('edit-mod-id-visible').value;

        // Protegemos la captura para que Firebase nunca reciba "undefined"
        const selectDocente = document.getElementById('edit-mod-docente');
        const selectCategoria = document.getElementById('edit-mod-categoria');

        const docenteNuevo = selectDocente ? selectDocente.value : "";
        const categoriaNueva = selectCategoria ? selectCategoria.value : "";

        // 👇 AQUÍ ESTÁ LA MAGIA: Declaramos cantidadNueva ANTES del try
        const inputCantidad = document.getElementById('edit-mod-cantidad-preguntas');
        const cantidadNueva = inputCantidad ? (parseInt(inputCantidad.value) || 10) : 10;
        const evalPreEdit = document.getElementById('edit-mod-eval-pre').checked;
        const evalPostEdit = document.getElementById('edit-mod-eval-post').checked;
        const evalTamEdit = document.getElementById('edit-mod-eval-tam').checked;

        try {
            // ACTUALIZAR EL MÓDULO EN RTDB
            await update(ref(db, `modulos/${idTecnico}`), {
                nombre: nombreNuevo,
                descripcion: descNueva,
                docenteAsignado: docenteNuevo,
                categoria: categoriaNueva,
                // 👇 Ahora Firebase sí encontrará el valor
                cantidadPreguntas: cantidadNueva,
                evaluaciones: {
        pre: evalPreEdit,
        post: evalPostEdit,
        tam: evalTamEdit
    }
            });

            alert("¡Módulo actualizado correctamente!");

            import('./historial.js').then(module => {
                module.registrarAccion('EDITAR', 'Módulos', `Actualizó el módulo: ${nombreNuevo} (${idTecnico}) con ${cantidadNueva} preguntas.`);
            });

            const modalEdit = document.getElementById('modal-edit-module');
            modalEdit.classList.remove('active');
            document.getElementById('form-edit-module').reset();

            cargarTablaModulos();

        } catch (error) {
            console.error("Error al actualizar módulo:", error);
            alert("Error al actualizar en la base de datos. Revisa la consola.");
        }
    });
}
// ==========================================
// GESTIÓN DE CATEGORÍAS
// ==========================================
window.abrirModalCategoria = () => document.getElementById('modal-categoria').classList.add('active');
window.cerrarModalCategoria = () => {
    document.getElementById('modal-categoria').classList.remove('active');
    document.getElementById('form-add-categoria').reset();
};

async function cargarCategoriasSelect(selectId, categoriaAsignada = "") {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const snapshot = await get(child(ref(db), "categorias_modulos"));
        select.innerHTML = '<option value="">Seleccione una categoría...</option>';

        if (snapshot.exists()) {
            snapshot.forEach(doc => {
                const nombre = doc.val().nombre;
                const selected = (nombre === categoriaAsignada) ? 'selected' : '';
                select.innerHTML += `<option value="${nombre}" ${selected}>${nombre}</option>`;
            });
        }
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

// Guardar nueva categoría
document.getElementById('form-add-categoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombreCat = document.getElementById('cat-nombre').value.trim();

    try {
        const nuevaCatRef = push(ref(db, 'categorias_modulos'));
        await set(nuevaCatRef, { nombre: nombreCat });
        alert("Categoría guardada con éxito.");
        cerrarModalCategoria();

        // Recargar los selectores
        cargarCategoriasSelect('mod-categoria');
        cargarCategoriasSelect('edit-mod-categoria');
    } catch (error) {
        console.error("Error:", error);
        alert("Error al guardar la categoría.");
    }
});
// ==========================================
// FUNCIÓN PARA ABRIR EL MENÚ DESPLEGABLE
// ==========================================
window.toggleOpcionesModulo = (idDropdown) => {
    const dropdown = document.getElementById(idDropdown);
    if (dropdown) {
        // Cierra los otros menús abiertos
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            if (menu.id !== idDropdown) menu.classList.remove('show');
        });
        // Abre o cierra el actual
        dropdown.classList.toggle('show');
    }
};

// Cierra el menú desplegable si el usuario hace clic afuera de él
window.onclick = function (event) {
    if (!event.target.matches('.btn-opciones-main') && !event.target.closest('.btn-opciones-main')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
};

window.verCertificadosDeModulo = (idTecnico) => {
    const navCertificados = document.querySelector('[data-target="view-certificates"]');
    if (navCertificados) navCertificados.click();

    setTimeout(() => {
        const buscador = document.getElementById('search-cert');
        if (buscador) {
            buscador.value = idTecnico;
            buscador.dispatchEvent(new Event('input'));
        }
    }, 100);
};

// ==========================================
// EXPORTAR MÓDULOS A EXCEL
// ==========================================
window.exportarModulosExcel = () => {
    const filasTabla = document.querySelectorAll('#modules-table-body tr');
    const datosParaExcel = [];

    filasTabla.forEach(fila => {
        if (fila.style.display === 'none' || fila.cells.length <= 1) return;

        const nombreDesc = fila.cells[1].innerText.replace(/\n/g, ' - ').trim();

        datosParaExcel.push({
            "ID Módulo": fila.cells[0].innerText.trim(),
            "Nombre y Descripción": nombreDesc,
            "Estado": fila.cells[2].innerText.trim()
        });
    });

    if (datosParaExcel.length === 0) return alert("No hay módulos visibles para exportar.");

    const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Módulos");
    XLSX.writeFile(libro, `Módulos_ITCA_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);

    import('./historial.js').then(m => m.registrarAccion('EXPORTAR', 'Módulos', 'Descargó reporte de módulos en Excel.'));
};

