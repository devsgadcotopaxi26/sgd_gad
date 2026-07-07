-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS sistema (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    url VARCHAR(255),
    apikey VARCHAR(255) NOT NULL,
    apiKeyRest VARCHAR(255),
    descripcion VARCHAR(255)
);

-- Insertar la API-KEY 'pruebas' con el HASH en MAYÚSCULAS
-- El hash SHA-256 de 'pruebas' es: 78E0F111E13880461623910C28340D257BAD835C2B6CA3B6E8E815E98544D668
DELETE FROM sistema WHERE nombre = 'pruebas';
INSERT INTO sistema (nombre, url, apikey, descripcion)
VALUES ('pruebas', 'http://host.docker.internal/firmadigital-tester-master/transversal/callback.php', '78E0F111E13880461623910C28340D257BAD835C2B6CA3B6E8E815E98544D668', 'Entorno de pruebas local');

-- SGD GAD Cotopaxi
-- apikey: SHA-256('sgd-gad-firma2026') en MAYÚSCULAS
-- apiKeyRest: clave que FirmaDigital incluye en X-API-KEY al llamar nuestro callback
DELETE FROM sistema WHERE nombre = 'sgd-gad';
INSERT INTO sistema (nombre, url, apikey, apiKeyRest, descripcion)
VALUES (
    'sgd-gad',
    'http://backend:8000/api/v1/documentos/firmaec/callback/',
    '5224FDCE8F6DDAA236C120A3FD0C80BD75B1033019625A0DE9CBD758630DC271',
    'sgd-gad-callback-2026',
    'SGD GAD Provincial Cotopaxi'
);
