<?php
// Permitir conexiones desde tu panel de administrador (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Carpeta donde se guardarán las imágenes (debe existir)
$target_dir = "uploads/imagenes/"; 

// Crear la carpeta automáticamente si no existe
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0755, true);
}

if(isset($_FILES["file"])) {
    // Generar un nombre único basado en la fecha y un ID aleatorio
    $extension = pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION);
    $filename = uniqid() . "_" . time() . "." . $extension;
    $target_file = $target_dir . $filename;
    
    // Mover el archivo subido a la carpeta final
    if (move_uploaded_file($_FILES["file"]["tmp_name"], $target_file)) {
        
        // ⚠️ CAMBIA ESTO por el dominio real de tu servidor
        $server_domain = "https://tu-dominio-servidor.com"; 
        
        $url_final = $server_domain . "/" . $target_file;
        
        // Devolver la URL en formato JSON para que JavaScript la lea
        echo json_encode(["status" => "success", "url" => $url_final]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al guardar el archivo en el disco."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "No se recibió ningún archivo."]);
}
?>