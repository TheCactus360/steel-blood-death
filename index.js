const express = require('express');
const path = require('path');
const Datastore = require('nedb'); // Añadido para la base de datos
const app = express();

// --- CONFIGURACIÓN DE BASE DE DATOS ---
// Esto crea archivos .db en tu raíz automáticamente
const dbUsuarios = new Datastore({ filename: 'usuarios.db', autoload: true });
const dbSoldados = new Datastore({ filename: 'soldados.db', autoload: true });

// Servir archivos estáticos (CSS, imágenes) desde la raíz
app.use(express.static(__dirname)); 

// Middlewares para leer datos de los formularios (IMPORTANTE: Antes de las rutas POST)
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 

// --- RUTAS DE NAVEGACIÓN (GET) ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); 
});

app.get('/barracas', (req, res) => {
    res.sendFile(path.join(__dirname, 'barracas.html')); 
});

app.get('/ver-escuadron', (req, res) => {
    res.sendFile(path.join(__dirname, 'escuadron.html'));
});

app.get('/combate', (req, res) => {
    res.sendFile(path.join(__dirname, 'combate.html'));
});

// --- RUTAS DE ACCIÓN (POST) CON PERSISTENCIA ---

// Ruta para el Registro: Ahora guarda en usuarios.db
app.post('/registrar', (req, res) => {
    const { username, email, password } = req.body;
    
    dbUsuarios.insert({ username, email, password, fecha: new Date() }, (err, nuevoDoc) => {
        if (err) return res.status(500).send("Error en el alto mando al registrar.");
        console.log(`Registrado en DB: ${nuevoDoc.username}`);
        res.send(`<h1>RECLUTAMIENTO EXITOSO</h1><p>Agente ${username}, sus credenciales han sido guardadas en el sistema.</p><a href="/">Volver</a>`);
    });
});

// Ruta para el Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    // Buscamos si el usuario existe
    dbUsuarios.findOne({ email, password }, (err, usuario) => {
        if (usuario) {
            res.send(`<h1>ACCESO CONCEDIDO</h1><p>Bienvenido, agente ${usuario.username}.</p><a href="/">Entrar al panel</a>`);
        } else {
            res.send(`<h1>ACCESO DENEGADO</h1><p>Credenciales no encontradas en el registro.</p><a href="/">Reintentar</a>`);
        }
    });
});

// Ruta para Crear Soldado: Ahora guarda en soldados.db
app.post('/crear-soldado', (req, res) => {
    const { nombre, tipo } = req.body;
    
    const nuevaUnidad = {
        nombre,
        tipo,
        nivel: 1,
        estado: "Listo para combate",
        creadoEn: new Date()
    };

    dbSoldados.insert(nuevaUnidad, (err, unidadGuardada) => {
        if (err) return res.status(500).send("Error al desplegar unidad.");
        console.log(`Unidad creada: ${unidadGuardada.nombre}`);
        res.send(`<h1>UNIDAD CREADA</h1><p>El soldado ${nombre} (${tipo}) ha sido asignado a las barracas.</p><a href="/barracas">Volver a Barracas</a>`);
    });
});

// --- EXTRA: RUTA PARA VER TUS DATOS ---
// Si entras a /api/soldados podrás ver que tus soldados siguen ahí
app.get('/api/soldados', (req, res) => {
    dbSoldados.find({}, (err, soldados) => {
        res.json(soldados);
    });
});

// --- CONFIGURACIÓN DEL PUERTO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de combate activo en puerto ${PORT}`);
});
