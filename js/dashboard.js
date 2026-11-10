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
                if (rol === 'rol_admin' || rol === 'admin') {
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

        // NUEVO: Llamar a la función del carrusel después de actualizar los números
        cargarCarruselModulos();

    } catch (error) {
        console.error("Error al actualizar el Dashboard:", error);
        [uiUsers, uiModules, uiAdmins, uiCerts].forEach(el => {
            if(el) el.innerText = "Error";
        });
    }
}

// ============================================================================
// 1.5. NUEVO: CARGAR CARRUSEL DE MÓDULOS
// ============================================================================
export async function cargarCarruselModulos() {
    const carousel = document.getElementById('dashboard-carousel');
    if (!carousel) return;

    try {
        const snapshot = await get(child(ref(db), "modulos"));
        
        if (!snapshot.exists()) {
            carousel.innerHTML = '<div style="color:#64748b;">No hay módulos registrados.</div>';
            return;
        }

        let modulosHTML = '';
        const defaultImg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiNlMmU4ZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjQ3NDhiIj5Nw7RkdWxvPC90ZXh0Pjwvc3ZnPg==";

        let modulos = [];
        snapshot.forEach(doc => {
            modulos.push({ id: doc.key, ...doc.val() });
        });

        // Invertimos para mostrar los últimos módulos creados primero
        modulos.reverse();

        modulos.forEach(data => {
            const imgPortada = data.url_imagen || data.portadaUrl || data.imagenUrl || defaultImg;
            
            modulosHTML += `
                <div class="carousel-item" title="${data.nombre}">
                    <img src="${imgPortada}" alt="${data.nombre}" onerror="this.onerror=null; this.src='${defaultImg}';">
                    <div class="carousel-item-title">${data.nombre}</div>
                </div>
            `;
        });

        carousel.innerHTML = modulosHTML;

    } catch (error) {
        console.error("Error al cargar carrusel:", error);
        carousel.innerHTML = '<div style="color:red;">Error al cargar los módulos.</div>';
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
       
    }
});