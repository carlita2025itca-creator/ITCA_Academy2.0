// 1. Cambia las importaciones en la parte superior para usar FIRESTORE en lugar de database
import { db, auth } from './firebase-config.js'; 
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function initLogin() {
    console.log("✅ initLogin() ejecutado: Buscando el formulario en el HTML...");

    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');

    if (!loginForm) {
        console.error("❌ ERROR CRÍTICO: No se encontró <form id='login-form'> en tu HTML.");
        return; 
    }

loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
      
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value; 

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("✅ Auth exitoso:", userCredential.user.uid);

            // =================================================================
            // 2. CONSULTAR FIRESTORE (Colección "administradores")
            // =================================================================
            const adminsRef = collection(db, "administradores");
            const q = query(adminsRef, where("correo", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // Si tienes a los alumnos en otra colección, podrías repetir la búsqueda 
                // aquí apuntando a collection(db, "usuarios") antes de bloquear el acceso.
                alert("⚠️ Error: Tu cuenta existe en Auth pero faltan tus datos en Firestore.");
                await signOut(auth);
                return;
            }

            // Extraer datos
            let usuarioValido = null;
            querySnapshot.forEach(doc => {
                usuarioValido = { id: doc.id, ...doc.data() };
            });

            if (usuarioValido) {
                // Convertir rol a minúsculas para validarlo sin problemas
                const rolRaw = usuarioValido.rol || usuarioValido.Rol || 'rol_usuario';
                const rol = rolRaw.toLowerCase();

                if (rol === 'rol_administrador' || rol === 'rol_docente' || rol === 'admin' || rol === 'docente' || rol === 'administrador') {
                    
                    // Guardar sesión y redirigir
                    localStorage.setItem('sesionITCA', JSON.stringify(usuarioValido));
                    localStorage.setItem('rol', rol);
                    localStorage.setItem('correo', usuarioValido.correo);
                    
                    // ... (resto de tus importaciones para módulos y dashboard)
                    console.log("✅ Acceso concedido.");

                } else {
                    alert("⛔ Acceso denegado. No tienes permisos.");
                    await signOut(auth);
                }
            }

        } catch (error) {
            console.error("🚨 Error:", error);
            
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
// =================================================================
    // NUEVO: Lógica para Mostrar/Ocultar Contraseña (Icono de Sistema)
    // =================================================================
    const togglePassword = document.getElementById('togglePassword');
    const passwordField = document.getElementById('password');

    if (togglePassword && passwordField) {
        togglePassword.addEventListener('click', function () {
            // 1. Alternamos entre texto y contraseña
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            
            // 2. Buscamos el icono <i> dentro del span y alternamos sus clases
            const icon = this.querySelector('i');
            if (icon) {
                if (type === 'password') {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                } else {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            }
        });
    }