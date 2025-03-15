/**
 * SERVIDOR WEB SIMPLE PARA LA APLICACIÓN DE LISTA DE COMPRAS
 * Este servidor proporciona acceso a los archivos estáticos de la aplicación
 */

// Importación de módulos necesarios
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuración del servidor
const PORT = 8000;

/**
 * Definición de tipos MIME para diferentes extensiones de archivo
 * Esto permite que el navegador interprete correctamente los archivos servidos
 */
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.json': 'application/json',
    '.csv': 'text/csv'
};

// Creación del servidor HTTP
const server = http.createServer((req, res) => {
    console.log(`Request received for: ${req.url}`);
    
    // Normalizar la URL para evitar problemas con espacios y caracteres especiales
    let requestUrl = decodeURIComponent(req.url);
    
    // Eliminar los parámetros de consulta de la URL
    requestUrl = requestUrl.split('?')[0];
    
    // Determinar la ruta del archivo solicitado
    let filePath = path.join(__dirname, requestUrl === '/' ? 'index.html' : requestUrl);
    
    // Manejar URLs con espacios en los nombres de archivo
    filePath = filePath.replace(/%20/g, ' ');
    
    const ext = path.extname(filePath);
    
    console.log(`Attempting to serve: ${filePath}`);
    
    // Verificar si el archivo existe
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error(`File not found: ${filePath}`);
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        // Leer y servir el archivo solicitado
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error(`Error reading file: ${err.message}`);
                res.writeHead(500);
                res.end('Internal Server Error');
                return;
            }

            // Enviar el archivo con el tipo MIME correcto
            const contentType = MIME_TYPES[ext] || 'text/plain';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
            console.log(`Successfully served: ${filePath} as ${contentType}`);
        });
    });
});

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
