const express = require('express');
const path = require('path');
const app = express();

// IMPORTANTE: Esto permite que el HTML encuentre tu style.css y tus imágenes
app.use(express.static(__dirname)); 

app.get('/', (req, res) => {
    // Esto busca el index.html en la carpeta principal
    res.sendFile(path.join(__dirname, 'index.html')); 
});

// Rutas vacías para que no den error 404 al profesor
app.get('/barracas', (req, res) => res.send("Área de Barracas en construcción..."));
app.get('/combate', (req, res) => res.send("Iniciando simulación de combate..."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});

// Ruta para Barracas
app.get('/barracas', (req, res) => {
    res.sendFile(path.join(__dirname, 'barracas.html')); 
});

// Ruta para Escuadrón
app.get('/ver-escuadron', (req, res) => {
    res.sendFile(path.join(__dirname, 'escuadron.html'));
});

// Ruta para Combate
app.get('/combate', (req, res) => {
    res.sendFile(path.join(__dirname, 'combate.html'));
});