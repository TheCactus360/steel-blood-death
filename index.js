const express = require('express');
const path = require('path');
const app = express();

// Servir archivos estáticos (CSS, imágenes) desde la raíz
app.use(express.static(__dirname)); 

// --- RUTAS DE NAVEGACIÓN ---

// Inicio
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); 
});

// Barracas
app.get('/barracas', (req, res) => {
    res.sendFile(path.join(__dirname, 'barracas.html')); 
});

// Escuadrón
app.get('/ver-escuadron', (req, res) => {
    res.sendFile(path.join(__dirname, 'escuadron.html'));
});

// Combate
app.get('/combate', (req, res) => {
    res.sendFile(path.join(__dirname, 'combate.html'));
});

// --- CONFIGURACIÓN DEL PUERTO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de combate activo en puerto ${PORT}`);
});
