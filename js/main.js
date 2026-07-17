import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Lógica de Sub-vistas y Preguntas
import './preguntas.js';
import { actualizarDashboard, inicializarMenuPerfil } from './dashboard.js';

// IMPORTACIÓN DE MÓDULOS DE LÓGICA
import { initLogin } from './login.js';
import { initUsuariosModule, cargarTablaUsuarios } from './usuarios.js';
import { cargarTablaHistorial } from './historial.js';
import { cargarTablaModulos, initModulosModule } from './modulos.js';
import { cargarTablaCertificados, initCertificadosModule, poblarFiltroModulos } from './certificados.js';

// --- 1. INICIALIZACIÓN ÚNICA ---
initLogin();
initUsuariosModule();
initModulosModule();

// Elementos Globales
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const userDisplayEmail = document.getElementById('user-display-email');
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');

// ==========================================
// SEGURIDAD DEL MENÚ: DESTRUIR BOTONES SENSIBLES
// ==========================================
window.aplicarSeguridadMenu = () => {
    const rolActual = (window.rolUsuarioActual || localStorage.getItem('rol') || '').toLowerCase().trim();
    const esAdmin = (rolActual === 'rol_administrador');

    // Capturamos los botones directamente por su atributo data-target (sin necesidad de IDs)
    const btnUsuarios = document.querySelector('[data-target="view-users"]');
    const btnAdmins = document.querySelector('[data-target="view-admins"]');
    const btnHistorial = document.querySelector('[data-target="view-history"]');
    
    if (!esAdmin) {
        // Destrucción visual forzada
        if (btnUsuarios) btnUsuarios.style.cssText = 'display: none !important;';
        if (btnAdmins) btnAdmins.style.cssText = 'display: none !important;';
        if (btnHistorial) btnHistorial.style.cssText = 'display: none !important;';
    } else {
        // Restauración para el administrador
        if (btnUsuarios) btnUsuarios.style.display = '';
        if (btnAdmins) btnAdmins.style.display = '';
        if (btnHistorial) btnHistorial.style.display = '';
    }
};

// --- 2. OBSERVADOR DE SESIÓN (TIEMPO REAL Y PROTECCIÓN ANTI-FANTASMAS) ---
window.actualizarSesionGlobal = () => {
    const sesionString = localStorage.getItem('sesionITCA');
    let usuario = null;

    // 1. Verificamos que la sesión no esté corrupta
    if (sesionString) {
        try {
            usuario = JSON.parse(sesionString);
            // Si el objeto no tiene el Rol guardado, es una sesión rota de pruebas anteriores. La anulamos.
            if (!usuario || (!usuario.rol && !usuario.Rol)) {
                usuario = null; 
            }
        } catch (error) {
            usuario = null; // Si no es formato válido, lo anulamos
        }
    }

    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const userDisplayEmail = document.getElementById('user-display-email');

    // 2. Si hay un usuario válido y perfecto...
    if (usuario) {
        // Asignamos las variables globales
        window.correoUsuarioActual = usuario.correo || usuario.Correo || localStorage.getItem('correo');
        window.rolUsuarioActual = usuario.rol || usuario.Rol || localStorage.getItem('rol');
        
        if (userDisplayEmail && window.correoUsuarioActual) {
            userDisplayEmail.textContent = window.correoUsuarioActual;
        }
        
        if (typeof window.aplicarSeguridadMenu === 'function') {
            window.aplicarSeguridadMenu();
        }

        if (loginScreen && dashboardScreen) {
            loginScreen.classList.remove('active');
            dashboardScreen.classList.add('active');
        }

        // 🔥 CRÍTICO: Si entró directo por tener sesión guardada, forzamos a que cargue el contenido inicial del panel
        import('./dashboard.js').then(modulo => {
            modulo.actualizarDashboard();
            modulo.inicializarMenuPerfil({ email: window.correoUsuarioActual }, usuario);
        }).catch(e => console.error("Error cargando dashboard:", e));

        // Seleccionamos visualmente el primer botón del menú (Dashboard) para que no quede la pantalla en blanco
        const tabInicio = document.querySelector('[data-target="view-dashboard"]');
        if (tabInicio) tabInicio.click();

    } else {
        // 3. SI ES SESIÓN FANTASMA O NO ESTÁ LOGUEADO -> DESTRUIR Y MANDAR AL LOGIN
        localStorage.clear(); // Limpiamos la basura del navegador
        
        window.correoUsuarioActual = null;
        window.rolUsuarioActual = null;
        if (userDisplayEmail) userDisplayEmail.textContent = "Esperando...";
        
        if (loginScreen && dashboardScreen) {
            dashboardScreen.classList.remove('active');
            loginScreen.classList.add('active');
        }
    }
};

// Ejecutamos la función inmediatamente al cargar la página
window.actualizarSesionGlobal();

// --- 3. SISTEMA DE NAVEGACIÓN (SPA) CON CANDADO DE RUTAS ---
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-target');
        const rolActual = (window.rolUsuarioActual || localStorage.getItem('rol') || '').toLowerCase().trim();
        const esAdmin = (rolActual === 'rol_administrador');

        // 🛡️ CANDADO ESTRICTO: Si no es admin y toca una ruta prohibida, se bloquea la acción.
        if (!esAdmin && (targetId === 'view-users' || targetId === 'view-admins' || targetId === 'view-history')) {
            console.warn("Intento de acceso denegado a ruta protegida.");
            return; 
        }
        
        navItems.forEach(nav => nav.classList.remove('active'));
        e.currentTarget.classList.add('active');

        viewSections.forEach(section => section.classList.remove('active'));
        
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        } else {
            console.error(`❌ ERROR HTML: No se encontró ningún contenedor con el id="${targetId}".`);
            return;
        }

        // Carga de datos
        if(targetId === 'view-dashboard') {
            actualizarDashboard();
        }
        else if(targetId === 'view-users') {
            cargarTablaUsuarios(['usuario', 'docente', 'admin', 'rol_usuario', 'rol_docente', 'rol_administrador'], 'users-table-body', false);
        } 
        else if (targetId === 'view-admins') {
            cargarTablaUsuarios(['admin', 'rol_administrador'], 'admins-table-body', false);
        } 
        else if (targetId === 'view-modules') {
            cargarTablaModulos(); 
        }
        else if (targetId === 'view-history') {
            cargarTablaHistorial();
        }
        else if (targetId === 'view-certificates') {
            cargarTablaCertificados();
            setTimeout(() => {
                initCertificadosModule();
            }, 100);
        }
    });
});

// --- 4. CERRAR SESIÓN TOTAL ---
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.replaceWith(btnLogout.cloneNode(true)); // Limpia listeners duplicados
    document.getElementById('btn-logout').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            localStorage.clear(); // Limpiamos rastro del rol
            window.location.reload(); // Recarga limpia de seguridad
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    });
}