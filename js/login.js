// IMPORTACIONES PARA REALTIME DATABASE
import { db, auth } from './firebase-config.js'; 
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export function initLogin() {
    console.log("✅ initLogin() ejecutado: Buscando el formulario en el HTML...");

    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');

    if (!loginForm) return; 

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
      
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value; 

        try {
            // 1. INICIO DE SESIÓN CON FIREBASE AUTH
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("✅ Auth exitoso:", userCredential.user.uid);

            // 2. CONSULTAR REALTIME DATABASE (Colección "Usuarios")
            const usuariosRef = ref(db, "Usuarios");
            
            // Según tu captura, el campo se llama "Correo" (con C mayúscula)
            let consulta = query(usuariosRef, orderByChild("Correo"), equalTo(email));
            let snapshot = await get(consulta);

            // Si no lo encuentra, probamos con minúscula por si acaso
            if (!snapshot.exists()) {
                consulta = query(usuariosRef, orderByChild("correo"), equalTo(email));
                snapshot = await get(consulta);
            }

            if (!snapshot.exists()) {
                alert("⚠️ Error: Tu cuenta existe en Auth pero faltan tus datos en la Base de Datos.");
                await signOut(auth); 
                return;
            }

            // Extraer datos del usuario
            let usuarioValido = null;
            snapshot.forEach(doc => {
                usuarioValido = { id: doc.key, ...doc.val() };
            });

            if (usuarioValido) {
                // Según tu captura, el rol es "rol_admin". Lo pasamos a minúscula por seguridad.
                const rolRaw = usuarioValido.Rol || usuarioValido.rol || 'rol_usuario';
                const rol = rolRaw.toLowerCase();

                // 3. VERIFICAR PERMISOS PARA EL PANEL WEB
                if (rol === 'rol_admin' || rol === 'rol_administrador' || rol === 'administrador' || rol === 'admin' || rol === 'rol_docente' || rol === 'docente') {
                    
                    localStorage.setItem('sesionITCA', JSON.stringify(usuarioValido));
                    localStorage.setItem('rol', rol);
                    localStorage.setItem('correo', usuarioValido.Correo || usuarioValido.correo);
                    
                    if (typeof window.actualizarSesionGlobal === 'function') {
                        window.actualizarSesionGlobal();
                    }

                    // Cargar módulos del Dashboard
                    import('./dashboard.js').then(modulo => {
                        if (modulo.actualizarDashboard) modulo.actualizarDashboard();
                        if (modulo.inicializarMenuPerfil) modulo.inicializarMenuPerfil({ email: email }, usuarioValido);
                    }).catch(err => console.error("Error cargando dashboard:", err));
                    
                    import('./modulos.js').then(modulo => {
                        if (modulo.cargarTablaModulos) modulo.cargarTablaModulos();
                    }).catch(err => console.error("Error cargando modulos:", err));

                    console.log("✅ Acceso concedido al Panel Web.");

                } else {
                    alert("⛔ Acceso denegado. Tu cuenta no tiene permisos de administrador o docente.");
                    await signOut(auth);
                }
            }

        } catch (error) {
            console.error("🚨 Error de autenticación: ", error);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                alert("❌ Correo o contraseña incorrectos.");
            } else if (error.code === 'auth/too-many-requests') {
                alert("⚠️ Demasiados intentos fallidos. Intenta más tarde.");
            } else {
                alert("🚨 Error al iniciar sesión: " + error.message);
            }
        }
    });

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

    // Mostrar/Ocultar contraseña
    const togglePassword = document.getElementById('togglePassword');
    const passwordField = document.getElementById('password');

    if (togglePassword && passwordField) {
        const newToggle = togglePassword.cloneNode(true);
        togglePassword.parentNode.replaceChild(newToggle, togglePassword);
        
        newToggle.addEventListener('click', function () {
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.remove(type === 'password' ? 'fa-eye' : 'fa-eye-slash');
                icon.classList.add(type === 'password' ? 'fa-eye-slash' : 'fa-eye');
            }
        });
    }
}