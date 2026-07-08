-- 1. Crear la base de datos llamada 'mi_catalogo' si no existe
CREATE DATABASE IF NOT EXISTS mi_catalogo;

-- 2. Seleccionar la base de datos para trabajar en ella
USE mi_catalogo;

-- 3. Crear la tabla donde se registrarán los PDF
CREATE TABLE IF NOT EXISTS catalogos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    ruta_pdf VARCHAR(255) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
