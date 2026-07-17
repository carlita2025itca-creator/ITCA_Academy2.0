// dashboard.js
import { db } from './firebase-config.js';
// 1. CAMBIO: Importamos de Realtime Database
import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export async function actualizarDashboard() {
    // 1. Identificamos dónde vamos a pintar los números
    const uiUsers = document.getElementById('dash-count-users');
    const uiModules = document.getElementById('dash-count-modules');
    const uiAdmins = document.getElementById('dash-count-admins');
    const uiCerts = document.getElementById('dash-count-certs');

    // 2. Ponemos un efecto de "Cargando"
    if(uiUsers) uiUsers.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';
    if(uiModules) uiModules.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';
    if(uiAdmins) uiAdmins.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';
    if(uiCerts) uiCerts.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';

    try {
        const dbRef = ref(db);
        
        // 3. Consultamos Firebase RTDB en paralelo (más rápido)
        const [usersSnap, modulosSnap, certsSnap] = await Promise.all([
            get(child(dbRef, "Usuarios")), 
            get(child(dbRef, "modulos")),
            get(child(dbRef, "resultados")) // O el nombre del nodo donde guardas certificados/notas
        ]);

        // 4. Calculamos los totales
        let totalUsuarios = 0;
        let totalAdmins = 0;
        let totalModulos = 0;
        let totalCerts = 0;

        // Conteo de usuarios y filtrado de admins
        if (usersSnap.exists()) {
            usersSnap.forEach(doc => {
                totalUsuarios++;
                const data = doc.val();
                const rol = data.Rol || data.rol || '';
                // Revisamos si es administrador
                if (rol === 'rol_administrador' || rol === 'admin') {
                    totalAdmins++;
                }
            });
        }

        // Conteo rápido de módulos
        if (modulosSnap.exists()) {
            totalModulos = Object.keys(modulosSnap.val()).length;
        }

        // Conteo rápido de certificados/resultados
        if (certsSnap.exists()) {
            totalCerts = Object.keys(certsSnap.val()).length;
        }

        // 5. Inyectamos los números reales en la pantalla
        if(uiUsers) uiUsers.innerText = totalUsuarios;
        if(uiModules) uiModules.innerText = totalModulos;
        if(uiAdmins) uiAdmins.innerText = totalAdmins;
        if(uiCerts) uiCerts.innerText = totalCerts;

    } catch (error) {
        console.error("Error al actualizar el Dashboard:", error);
        if(uiUsers) uiUsers.innerText = "Error";
        if(uiModules) uiModules.innerText = "Error";
        if(uiAdmins) uiAdmins.innerText = "Error";
        if(uiCerts) uiCerts.innerText = "Error";
    }
}
// ============================================================================
// NUEVO: INICIALIZAR MENÚ DE PERFIL
// ============================================================================
export function inicializarMenuPerfil() {
    // 1. Datos del usuario
    const sesionGuardada = localStorage.getItem('sesionITCA');
    if (sesionGuardada) {
        const sesion = JSON.parse(sesionGuardada);
        const nombre = sesion.Nombre || sesion.nombre || 'Administrador';
        const apellido = sesion.Apellido || sesion.apellido || '';
        const nameElement = document.getElementById('topbar-user-name');
        const initialElement = document.getElementById('profile-initial');
        if(nameElement) nameElement.textContent = `${nombre} ${apellido}`.trim();
        if(initialElement) initialElement.textContent = nombre.charAt(0).toUpperCase();
    }

    // 2. ELIMINAR ESCUCHAS PREVIAS (Para evitar que se pierda el clic)
    const btn = document.getElementById('btn-profile-dropdown');
    if (btn) {
        // Clonamos el botón para borrar cualquier evento basura que tenga pegado
        const nuevoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(nuevoBtn, btn);

        // 3. ASIGNAR EVENTO ÚNICO
        nuevoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('profile-dropdown');
            if (menu) menu.classList.toggle('active');
        });
    }

    // 4. Cierre global fuera del botón
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('profile-dropdown');
        const btn = document.getElementById('btn-profile-dropdown');
        if (menu && !menu.contains(e.target) && e.target !== btn) {
            menu.classList.remove('active');
        }
    });

    // 5. Logout único
    const btnLogout = document.getElementById('btn-logout-dropdown');
    if (btnLogout) {
        btnLogout.onclick = () => {
            localStorage.clear();
            window.location.reload();
        };
    }
}