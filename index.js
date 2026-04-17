const express = require('express');
const path = require('path');
const Datastore = require('nedb');
const app = express();

// --- CONFIGURACIÓN DE BASES DE DATOS ---
const dbUsuarios = new Datastore({ filename: 'usuarios.db', autoload: true });
const dbSoldados = new Datastore({ filename: 'soldados.db', autoload: true });

app.use(express.static(__dirname)); 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- RUTAS DE NAVEGACIÓN (GET) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/barracas', (req, res) => res.sendFile(path.join(__dirname, 'barracas.html')));
app.get('/ver-escuadron', (req, res) => res.sendFile(path.join(__dirname, 'escuadron.html')));
app.get('/combate', (req, res) => res.sendFile(path.join(__dirname, 'combate.html')));

// --- RUTAS DE LA API (Para el Escuadrón) ---

// Obtener todos los soldados (Tu HTML llama a /api/escuadron)
app.get('/api/escuadron', (req, res) => {
    dbSoldados.find({}, (err, docs) => {
        if (err) return res.status(500).json([]);
        res.json(docs);
    });
});

// Eliminar un soldado (Para el botón "Dar de Baja")
app.delete('/api/soldado/:id', (req, res) => {
    dbSoldados.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
        if (err) return res.status(500).send("Error");
        res.sendStatus(200);
    });
});

// --- RUTAS DE ACCIÓN (POST) ---

// Registro de Usuario
app.post('/registrar', (req, res) => {
    const { username, email, password } = req.body;
    dbUsuarios.insert({ username, email, password, fecha: new Date() }, (err) => {
        if (err) return res.status(500).send("Error");
        res.send(`<h1>RECLUTAMIENTO EXITOSO</h1><p>Agente ${username} registrado.</p><a href="/">Volver</a>`);
    });
});

// Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    dbUsuarios.findOne({ email, password }, (err, user) => {
        if (user) res.send(`<h1>ACCESO CONCEDIDO</h1><p>Bienvenido ${user.username}</p><a href="/">Entrar</a>`);
        else res.send(`<h1>ACCESO DENEGADO</h1><a href="/">Reintentar</a>`);
    });
});

// Crear Soldado (Ajustado a tus campos de barracas.html)
app.post('/crear-soldado', (req, res) => {
    const nuevaUnidad = {
        nombre: req.body.nombre,
        clase: req.body.clase,
        arma_primaria: req.body.arma_primaria,
        arma_secundaria: req.body.arma_secundaria,
        arma_melee: req.body.arma_melee,
        perk: req.body.perk,
        nivel: 1,
        hp: 100,
        fecha: new Date()
    };

    dbSoldados.insert(nuevaUnidad, (err) => {
        if (err) return res.status(500).send("Error al guardar");
        // Redirigimos a la página de escuadrón para ver el resultado
        res.redirect('/ver-escuadron');
    });
});

// --- PUERTO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de combate activo en puerto ${PORT}`);
});
