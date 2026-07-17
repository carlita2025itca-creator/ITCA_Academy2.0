// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// 1. CAMBIO AQUÍ: Importamos Realtime Database en lugar de Firestore
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCKLT4vWDt3oStw9rF6eT0ngRrpVamanjc",
    authDomain: "itcaacademy2-0.firebaseapp.com",
    // 2. CAMBIO AQUÍ: Agregamos la URL de tu Realtime Database (la misma de Unity)
    databaseURL: "https://user-itcaacademy2-0-default-rtdb.firebaseio.com/",
    projectId: "itcaacademy2-0",
    storageBucket: "itcaacademy2-0.firebasestorage.app",
    messagingSenderId: "100451769928",
    appId: "1:100451769928:web:b9e79e8e7a1c90cb9a427d"
};

// App Principal (Para tu sesión de Admin)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// 3. CAMBIO AQUÍ: Inicializamos Database en lugar de Firestore
const db = getDatabase(app);

// App Secundaria (Para crear usuarios sin cerrar tu sesión)
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

// Exportamos todo para que los demás JS puedan usarlo
export { app, auth, db, secondaryAuth };