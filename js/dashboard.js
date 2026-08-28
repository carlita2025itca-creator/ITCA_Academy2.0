import { db, auth } from './firebase-config.js'; 
import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ============================================================================
// 1. OBTENER ESTADÍSTICAS DEL DASHBOARD
// ============================================================================
export async function actualizarDashboard() {
    const uiUsers = document.getElementById('dash-count-users');
    const uiModules = document.getElementById('dash-count-modules');
    const uiAdmins = document.getElementById('dash-count-admins');
    const uiCerts = document.getElementById('dash-count-certs');

    // Icono de carga mientras leen los datos
    const spinner = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>';
    if(uiUsers) uiUsers.innerHTML = spinner;
    if(uiModules) uiModules.innerHTML = spinner;
    if(uiAdmins) uiAdmins.innerHTML = spinner;
    if(uiCerts) uiCerts.innerHTML = spinner;

    try {
        const dbRef = ref(db);
        
        // Peticiones simultáneas
        const [usersSnap, modulosSnap, certsSnap] = await Promise.all([
            get(child(dbRef, "Usuarios")), 
            get(child(dbRef, "modulos")),
            get(child(dbRef, "certificados_obtenidos")) 
        ]);

        let totalUsuarios = 0;
        let totalAdmins = 0;
        let totalModulos = 0;
        let totalCerts = 0;

        // Conteo de Usuarios y Administradores
        if (usersSnap.exists()) {
            usersSnap.forEach(doc => {
                totalUsuarios++;
                const data = doc.val();
                const rol = (data.Rol || data.rol || '').toLowerCase();
                if (rol === 'rol_administrador' || rol === 'admin') {
                    totalAdmins++;
                }
            });
        }

        // Conteo de Módulos
        if (modulosSnap.exists()) {
            totalModulos = Object.keys(modulosSnap.val()).length;
        }

        // Conteo de Resultados/Certificados
        if (certsSnap.exists()) {
            totalCerts = Object.keys(certsSnap.val()).length;
        }

        // Renderizado final
        if(uiUsers) uiUsers.innerText = totalUsuarios;
        if(uiModules) uiModules.innerText = totalModulos;
        if(uiAdmins) uiAdmins.innerText = totalAdmins;
        if(uiCerts) uiCerts.innerText = totalCerts;

    } catch (error) {
        console.error("Error al actualizar el Dashboard:", error);
        [uiUsers, uiModules, uiAdmins, uiCerts].forEach(el => {
            if(el) el.innerText = "Error";
        });
    }
}

// ============================================================================
// 2. MENÚ DE PERFIL Y CERRAR SESIÓN
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

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('profile-dropdown');
        const currentBtn = document.getElementById('btn-profile-dropdown');
        if (menu && !menu.contains(e.target) && currentBtn && !currentBtn.contains(e.target)) {
            menu.classList.remove('active');
        }
    });

    const btnLogout = document.getElementById('btn-logout-dropdown');
    if (btnLogout) {
        btnLogout.onclick = async () => {
            try {
                await signOut(auth);
                localStorage.clear();
                window.location.reload();
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
            }
        };
    }
}

// ============================================================================
// 3. AUTO-INICIALIZACIÓN SEGURA DE SESIÓN
// ============================================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Carga los datos solo cuando Firebase verifica que hay usuario
        actualizarDashboard();
        inicializarMenuPerfil();
    } else {
        // window.location.href = "login.html"; // <-- LÍNEA COMENTADA (DESACTIVADA)
        console.log("No hay sesión iniciada, pero no redirigimos para evitar errores.");
    }
});
