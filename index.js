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

app.use(express.urlencoded({ extended: true })); // Para leer datos de formularios
app.use(express.json()); // Para leer datos JSON

// Ruta para el Registro
app.post('/registrar', (req, res) => {
    const { username, email, password } = req.body;
    console.log(`Registrando a: ${username}`);
    // Aquí iría la lógica para guardar en la base de datos (nedb)
    res.send(`<h1>RECLUTAMIENTO EXITOSO</h1><p>Agente ${username}, sus credenciales han sido procesadas.</p><a href="/">Volver</a>`);
});

// Ruta para el Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    console.log(`Intento de login: ${email}`);
    res.send(`<h1>ACCESO CONCEDIDO</h1><p>Bienvenido al sistema.</p><a href="/">Entrar al panel</a>`);
});

// Ruta para Crear Soldado
app.post('/crear-soldado', (req, res) => {
    const { nombre, tipo } = req.body;
    console.log(`Creando soldado: ${nombre} tipo ${tipo}`);
    res.send(`<h1>UNIDAD CREADA</h1><p>El soldado ${nombre} ha sido asignado a las barracas.</p><a href="/barracas">Volver a Barracas</a>`);
});

// --- CONFIGURACIÓN DEL PUERTO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de combate activo en puerto ${PORT}`);
});
