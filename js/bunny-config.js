// bunny-config.js

const BUNNY_STORAGE_ZONE = "inno-fusion"; 
const BUNNY_API_KEY = "f34ea1c4-4879-40c6-b2d65cd8a5d7-22c4-43ea"; 
const BUNNY_PULL_ZONE_URL = "https://inno-fusion.b-cdn.net"; 

export async function subiraBunny(archivo, rutaDestino) {
    // Usamos el servidor especificado de Brasil (br.storage.bunnycdn.com)
    const urlSubida = `https://br.storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${rutaDestino}`;

    const respuesta = await fetch(urlSubida, {
        method: 'PUT',
        headers: {
            'AccessKey': BUNNY_API_KEY,
            'Content-Type': 'application/octet-stream'
        },
        body: archivo
    });

    if (!respuesta.ok) {
        throw new Error(`Error al subir a Bunny.net: ${respuesta.statusText}`);
    }

    // Devuelve el enlace CDN público (.b-cdn.net) para mostrar en la web y guardar en Firebase
    return `${BUNNY_PULL_ZONE_URL}/${rutaDestino}`;
}