// login.js
import { db, auth } from './firebase-config.js'; 
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
export function initLogin() {
    console.log("✅ initLogin() ejecutado: Buscando el formulario en el HTML...");

    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');

    if (!loginForm) {
        console.error("❌ ERROR CRÍTICO: No se encontró <form id='login-form'> en tu HTML.");
        return; 
    }

    // Lógica de Ingreso
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
      
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value; 

        try {
            // =================================================================
            // 1. INICIO DE SESIÓN CON FIREBASE AUTH
            // =================================================================
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("✅ Firebase Auth aceptó las credenciales del usuario:", userCredential.user.uid);

            // =================================================================
            // 2. OBTENER DATOS DE LA BASE DE DATOS (Optimizado igual que Unity)
            // =================================================================
            const usuariosRef = ref(db, "Usuarios");
            
            // Intento 1: Buscar el usuario por el campo "correo" (minúscula)
            let consulta = query(usuariosRef, orderByChild("correo"), equalTo(email));
            let snapshot = await get(consulta);

            // Intento 2: Si no lo encuentra, buscar por el campo "Correo" (mayúscula) - Tu Plan B
            if (!snapshot.exists()) {
                consulta = query(usuariosRef, orderByChild("Correo"), equalTo(email));
                snapshot = await get(consulta);
            }

            // Si definitivamente no está en la base de datos
            if (!snapshot.exists()) {
                alert("⚠️ Error: Tu cuenta existe en Auth pero faltan tus datos en la Base de Datos.");
                await signOut(auth); // Lo sacamos por seguridad
                return;
            }

            // Extraer los datos del usuario que encontramos
            let usuarioValido = null;
            snapshot.forEach(doc => {
                // Como filtramos arriba, el documento que llega aquí es el correcto
                usuarioValido = { id: doc.key, ...doc.val() };
            });

            if (usuarioValido) {
                const rol = usuarioValido.Rol || usuarioValido.rol || 'rol_usuario';

                // =================================================================
                // 3. VERIFICAR PERMISOS PARA EL PANEL WEB
                // =================================================================
                if (rol === 'rol_administrador' || rol === 'rol_docente' || rol === 'admin' || rol === 'docente') {
                    
                    // Guardar sesión localmente
                    localStorage.setItem('sesionITCA', JSON.stringify(usuarioValido));
                    localStorage.setItem('rol', rol);
                    localStorage.setItem('correo', usuarioValido.Correo || usuarioValido.correo);
                    
                    if (typeof window.actualizarSesionGlobal === 'function') {
                        window.actualizarSesionGlobal();
                    }

                    // Cargar módulos del Dashboard
                    import('./dashboard.js').then(modulo => {
                        if (modulo.actualizarDashboard) modulo.actualizarDashboard();
                        // Pasamos directamente el 'email' capturado del formulario
                        if (modulo.inicializarMenuPerfil) modulo.inicializarMenuPerfil({ email: email }, usuarioValido);
                    }).catch(err => console.error("Error cargando dashboard:", err));
                    
                    import('./modulos.js').then(modulo => {
                        if (modulo.cargarTablaModulos) modulo.cargarTablaModulos();
                    }).catch(err => console.error("Error cargando modulos:", err));

                    console.log("✅ Acceso concedido al Panel Web.");

                } else {
                    alert("⛔ Acceso denegado. Tu cuenta no tiene permisos de administrador o docente.");
                    await signOut(auth); // Lo sacamos porque es un alumno queriendo entrar al panel
                }
            }

        } catch (error) {
            // El error real en consola (para ti)
            console.error("🚨 Error de autenticación: ", error);
            
            // El mensaje amigable para el usuario
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                alert("❌ Correo o contraseña incorrectos.");
            } else if (error.code === 'auth/too-many-requests') {
                alert("⚠️ Demasiados intentos fallidos por seguridad. Intenta de nuevo más tarde.");
            } else {
                alert("🚨 Error al iniciar sesión: " + error.message);
            }
        }
    });

    // =================================================================
    // 4. LÓGICA DE SALIDA (Cerrar sesión)
    // =================================================================
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await signOut(auth);
                localStorage.clear();
                window.location.reload();
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
            }
        });
    }
}