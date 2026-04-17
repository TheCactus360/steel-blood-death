const express = require('express');
const path = require('path');
const Datastore = require('nedb'); 
const app = express();

// --- 1. CONFIGURACIÓN DE BASE DE DATOS ---
// Se crean automáticamente los archivos .db para guardar la info
const db = {};
db.usuarios = new Datastore({ filename: 'usuarios.db', autoload: true });
db.soldados = new Datastore({ filename: 'soldados.db', autoload: true });

// --- 2. MIDDLEWARES ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir archivos estáticos (CSS y HTML)
app.use(express.static(path.join(__dirname, 'CSS')));
app.use(express.static(path.join(__dirname, 'hmtl')));

// --- 3. DICCIONARIOS DE DATOS ---
const armasDB = {
    "Rifle": { dmg: 25, crit: 0.20 },
    "Rifle con mirilla": { dmg: 20, crit: 0.39 },
    "Escopeta recortada": { dmg: 30, multi: true },
    "Rifle Revolver": { dmg: 35, penetracion: true },
    "King Revolver": { dmg: 45, crit: 0.10 },
    "Pistola de oficial": { dmg: 17 },
    "Pistola de mano": { dmg: 10 },
    "Revolver de mano": { dmg: 19 },
    "Escopeta de mano": { dmg: 25 },
    "Cuchillo": { dmg: 50 },
    "Pala": { dmg: 40, ignoreDef: true },
    "Martillo": { dmg: 30, crit: 0.20 },
    "Machete": { dmg: 40 },
    "Hoz": { dmg: 22 },
    "Ninguna": { dmg: 0 }
};

const habilidadesDB = {
    'Soldado':   { nombre: 'Suministro', desc: 'Munición y +20% daño', cd: 3, dur: 2 },
    'Ingeniero': { nombre: 'Búnker', desc: 'Estructura defensiva', cd: 4, dur: 3 },
    'Funerario': { nombre: 'Exequias', desc: 'Cura 25% salud', cd: 2, dur: 0 },
    'Oficial':   { nombre: 'Silbato', desc: '+2 Vel y +10% daño', cd: 3, dur: 2 },
    'Jaeger':    { nombre: 'Marca', desc: 'Enemigo sufre +20% daño', cd: 4, dur: 2 },
    'Lancer':    { nombre: 'Adrenalina', desc: 'Cura 15% y +20% daño', cd: 4, dur: 3 },
    'Vanguard':  { nombre: 'Guardia', desc: '+20% defensa a aliados', cd: 3, dur: 2 }
};

// --- 4. RUTAS DE NAVEGACIÓN ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'index.html')));
app.get('/barracas', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'barracas.html')));
app.get('/ver-escuadron', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'escuadron.html')));
app.get('/combate', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'combate.html')));

// --- 5. API DE DATOS (JSON) ---

// Obtener escuadrón (Esta es la que llama escuadron.html)
app.get('/api/escuadron', (req, res) => {
    db.soldados.find({}, (err, lista) => {
        if (err) return res.status(500).json({ error: err });
        res.json(lista); 
    });
});

// Eliminar soldado (Baja de unidad)
app.delete('/api/soldado/:id', (req, res) => {
    db.soldados.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true, removed: numRemoved });
    });
});

// --- 6. LÓGICA DE USUARIOS ---

app.post('/registrar', (req, res) => {
    const { username, password, email } = req.body;
    db.usuarios.findOne({ email: email }, (err, user) => {
        if (user) return res.status(400).send('ERROR: EMAIL YA REGISTRADO');
        
        const nuevoJugador = { username, email, password, creadoEn: new Date() };
        db.usuarios.insert(nuevoJugador, () => res.redirect('/'));
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.usuarios.findOne({ email, password }, (err, user) => {
        if (user) {
            res.send(`<h1>BIENVENIDO, AGENTE: ${user.username.toUpperCase()}</h1><a href="/barracas">IR A BARRACAS</a>`);
        } else {
            res.status(401).send("ERROR: CREDENCIALES INVÁLIDAS");
        }
    });
});

// --- 7. CREAR SOLDADO (Lógica de Barracas) ---
app.post('/crear-soldado', (req, res) => {
    const { nombre, clase, arma_primaria, arma_secundaria, arma_melee, perk } = req.body;
    
    // Cálculo de capacidad
    let slotsMax = (clase === "Soldado") ? 3 : 2;
    if (perk === "Sobreviviente") slotsMax += 1;

    // Cálculo de peso
    let pesoTotal = (arma_primaria !== "Ninguna" ? 2 : 0) + 
                    (arma_secundaria !== "Ninguna" ? 1 : 0) + 
                    (arma_melee !== "Ninguna" ? 1 : 0);

    if (pesoTotal > slotsMax) {
        return res.status(400).send(`<h1>ERROR: SOBRECARGA (${pesoTotal}/${slotsMax})</h1><a href="/barracas">VOLVER</a>`);
    }

    // Estructura de la unidad para la DB
    const nuevaUnidad = {
        nombre: nombre.toUpperCase(),
        clase: clase,
        perk: perk,
        equipo: "Jugador",
        hp: 100,
        hpMax: 100,
        nivel: 1,
        arma_primaria: arma_primaria,
        arma_secundaria: arma_secundaria,
        arma_melee: arma_melee,
        habilidad: habilidadesDB[clase] || { nombre: 'N/A' },
        creadoEn: new Date()
    };

    db.soldados.insert(nuevaUnidad, (err, doc) => {
        if (err) return res.status(500).send("ERROR CRÍTICO");
        res.redirect('/ver-escuadron'); // Al terminar, vamos a ver el escuadrón
    });
});

// --- 8. INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`SISTEMA BSD ONLINE - MODO OPERATIVO`);
    console.log(`PUERTO: ${PORT}`);
    console.log(`=========================================`);
});
