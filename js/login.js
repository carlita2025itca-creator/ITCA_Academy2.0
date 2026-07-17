// login.js
import { db } from './firebase-config.js';
import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Función idéntica a la de Unity para encriptar la clave
async function encriptarSHA256(mensaje) {
    const encoder = new TextEncoder();
    const data = encoder.encode(mensaje);
    // Usamos el API nativa del navegador para SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Convertimos cada byte a hexadecimal
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function initLogin() {
    console.log("✅ initLogin() ejecutado: Buscando el formulario en el HTML...");

    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const btnLogout = document.getElementById('btn-logout');

    if (!loginForm) {
        console.error("❌ ERROR CRÍTICO: No se encontró <form id='login-form'> en tu HTML.");
        alert("Falta el ID 'login-form' en el formulario HTML.");
        return; // Detenemos aquí si no existe
    }

    console.log("✅ Formulario encontrado. Esperando clic en ingresar...");

    // Lógica de Ingreso
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
      
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btnSubmit = loginForm.querySelector('button[type="submit"]');

        try {
            const hashPassword = await encriptarSHA256(password);
            const snapshot = await get(child(ref(db), "Usuarios"));

            if (!snapshot.exists()) {
                return;
            }

            let usuarioValido = null;

            snapshot.forEach(doc => {
                const data = doc.val();
                const correoBD = data.Correo || data.correo;
                const passBD = data.Password || data.password;

                if (correoBD && correoBD.toLowerCase() === email.toLowerCase()) {
                    if (passBD === hashPassword) {
                        usuarioValido = { id: doc.key, ...data };
                    }
                }
            });

            if (usuarioValido) {
                const rol = usuarioValido.Rol || usuarioValido.rol || 'rol_usuario';

                if (rol === 'rol_administrador' || rol === 'rol_docente' || rol === 'admin' || rol === 'docente') {
                    
                    // =================================================================
                    // 1. GUARDAMOS LA SESIÓN Y LAS CLAVES INDIVIDUALES EN LOCALSTORAGE
                    // =================================================================
                    localStorage.setItem('sesionITCA', JSON.stringify(usuarioValido));
                    localStorage.setItem('rol', rol);
                    localStorage.setItem('correo', usuarioValido.Correo || usuarioValido.correo);
                    
                    // =================================================================
                    // 2. DISPARAMOS LA FUNCIÓN DE SESIÓN GLOBAL (Establecida en main.js)
                    // =================================================================
                    // Esto inyectará variables globales, cambiará de pantalla y
                    // aplicará la seguridad de los botones inmediatamente
                    if (typeof window.actualizarSesionGlobal === 'function') {
                        window.actualizarSesionGlobal();
                    }

                    // 3. DISPARAR FUNCIONES DE CARGA (Importación dinámica)
                    import('./dashboard.js').then(modulo => {
                        modulo.actualizarDashboard();
                        // Pasamos el usuario simulando el objeto Auth, y los datos de la BD
                        modulo.inicializarMenuPerfil({ email: window.correoUsuarioActual }, usuarioValido);
                    });
                    
                    import('./modulos.js').then(modulo => {
                        modulo.cargarTablaModulos();
                    });

                }
            } else {
                alert("⚠️ Error: No se encontró un usuario con ese correo y contraseña.");
            }

        } catch (error) {
            alert("🚨 Error capturado: " + error.message);
        }
    });

    // Lógica de Salida
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.clear(); // Limpia todo rastro de sesión y roles
            window.location.reload();
        });
    }
}