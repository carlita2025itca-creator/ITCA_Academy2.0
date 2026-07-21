// dashboard.js
// 1. IMPORTANTE: Agregamos 'auth' en la importación
import { db, auth } from './firebase-config.js'; 
import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
// 2. IMPORTANTE: Traemos signOut de Auth
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; 

export async function actualizarDashboard() {
    const uiUsers = document.getElementById('dash-count-users');
    const uiModules = document.getElementById('dash-count-modules');
    const uiAdmins = document.getElementById('dash-count-admins');
    const uiCerts = document.getElementById('dash-count-certs');

    if(uiUsers) uiUsers.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';
    if(uiModules) uiModules.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';
    if(uiAdmins) uiAdmins.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';
    if(uiCerts) uiCerts.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';

    try {
        const dbRef = ref(db);
        
        const [usersSnap, modulosSnap, certsSnap] = await Promise.all([
            get(child(dbRef, "Usuarios")), 
            get(child(dbRef, "modulos")),
            get(child(dbRef, "resultados")) 
        ]);

        let totalUsuarios = 0;
        let totalAdmins = 0;
        let totalModulos = 0;
        let totalCerts = 0;

        if (usersSnap.exists()) {
            usersSnap.forEach(doc => {
                totalUsuarios++;
                const data = doc.val();
                const rol = data.Rol || data.rol || '';
                if (rol === 'rol_administrador' || rol === 'admin') {
                    totalAdmins++;
                }
            });
        }

        if (modulosSnap.exists()) {
            totalModulos = Object.keys(modulosSnap.val()).length;
        }

        if (certsSnap.exists()) {
            totalCerts = Object.keys(certsSnap.val()).length;
        }

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
// INICIALIZAR MENÚ DE PERFIL
// ============================================================================
export function inicializarMenuPerfil() {
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

    const btn = document.getElementById('btn-profile-dropdown');
    if (btn) {
        const nuevoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(nuevoBtn, btn);

        nuevoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('profile-dropdown');
            if (menu) menu.classList.toggle('active');
        });
    }

    // Corrección: Usar .contains() para proteger si hacen clic en un ícono dentro del botón
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('profile-dropdown');
        const currentBtn = document.getElementById('btn-profile-dropdown');
        if (menu && !menu.contains(e.target) && currentBtn && !currentBtn.contains(e.target)) {
            menu.classList.remove('active');
        }
    });

    // Corrección: Cierre de sesión real en Firebase Auth
    const btnLogout = document.getElementById('btn-logout-dropdown');
    if (btnLogout) {
        btnLogout.onclick = async () => {
            try {
                await signOut(auth); // Desconecta de Google
                localStorage.clear();
                window.location.reload();
            } catch (error) {
                console.error("Error al cerrar sesión desde el dropdown:", error);
            }
        };
    }
}