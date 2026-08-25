import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js"; // 1. Importar getStorage

const firebaseConfig = {
  apiKey: "AIzaSyBfsSCO1zfbzXoBjyx-7Mi88wgSWSfK1BM",
  authDomain: "user-itcaacademy2-0.firebaseapp.com",
  databaseURL: "https://user-itcaacademy2-0-default-rtdb.firebaseio.com",
  projectId: "user-itcaacademy2-0",
  storageBucket: "user-itcaacademy2-0.firebasestorage.app",
  messagingSenderId: "958619744222",
  appId: "1:958619744222:web:b76c54d90a2d0be5b9cf4f",
  measurementId: "G-W3001N6EVR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app); // 2. Inicializar la instancia de storage

const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

export { app, auth, db, storage, secondaryAuth }; // 3. Exportar storage