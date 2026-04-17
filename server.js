const express = require('express');
const path = require('path');
const Datastore = require('nedb'); 
const app = express();

// --- 1. CONFIGURACIÓN DE BASE DE DATOS ---
const db = {};
db.usuarios = new Datastore({ filename: 'usuarios.db', autoload: true });
db.soldados = new Datastore({ filename: 'soldados.db', autoload: true });

// --- 2. MIDDLEWARES ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir archivos estáticos
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

let batallasActivas = {}; 

// --- 4. RUTAS DE NAVEGACIÓN ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'index.html')));
app.get('/barracas', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'barracas.html')));
app.get('/ver-escuadron', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'escuadron.html')));
app.get('/combate', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'combate.html')));

// --- 5. API DE DATOS (JSON) ---

// Modificado para que cada uno vea solo sus soldados
app.get('/api/escuadron/:userId', (req, res) => {
    const userId = req.params.userId;
    // Si no hay userId, devuelve vacío para evitar mezclar datos
    if(!userId || userId === "null") return res.json([]);
    
    db.soldados.find({ owner: userId }, (err, lista) => {
        if (err) return res.status(500).json({ error: err });
        res.json(lista); 
    });
});

app.get('/api/armas', (req, res) => res.json(armasDB));

app.post('/api/generar-ia', (req, res) => {
    const { cantidad } = req.body; 
    const nombresEne = ["Desertor", "Insurrecto", "Miliciano", "Saqueador", "Renegado"];
    const clases = Object.keys(habilidadesDB);
    const armasEne = ["Rifle", "Escopeta recortada", "Pistola de mano", "Cuchillo", "Machete"];

    let escuadronIA = [];
    for (let i = 0; i < cantidad; i++) {
        let claseRandom = clases[Math.floor(Math.random() * clases.length)];
        let armaRandom = armasEne[Math.floor(Math.random() * armasEne.length)];
        escuadronIA.push({
            _id: 'ia_' + Math.random().toString(36).substr(2, 9),
            nombre: `${nombresEne[Math.floor(Math.random() * nombresEne.length)]} ${i+1}`,
            clase: claseRandom,
            arma_primaria: armaRandom,
            arma_secundaria: "Pistola de mano",
            arma_melee: "Cuchillo",
            hp: 100,
            equipo: "IA"
        });
    }
    res.json(escuadronIA);
});

// --- 6. LÓGICA DE USUARIOS Y TROPAS ---

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
            // Guardamos el ID en el navegador del usuario al loguearse
            res.send(`
                <script>
                    localStorage.setItem('userId', '${user._id}');
                    localStorage.setItem('userName', '${user.username}');
                    window.location.href = "/barracas";
                </script>
            `);
        } else {
            res.status(401).send("ERROR: CREDENCIALES INVÁLIDAS");
        }
    });
});

app.post('/crear-soldado', (req, res) => {
    const { nombre, clase, arma_primaria, arma_secundaria, arma_melee, perk, userId } = req.body;
    
    let slotsMax = (clase === "Soldado") ? 3 : 2;
    if (perk === "Sobreviviente") slotsMax += 1;

    let pesoTotal = (arma_primaria !== "Ninguna" ? 2 : 0) + 
                    (arma_secundaria !== "Ninguna" ? 1 : 0) + 
                    (arma_melee !== "Ninguna" ? 1 : 0);

    if (pesoTotal > slotsMax) {
        return res.status(400).send("SOBRECARGA");
    }

    const nuevaUnidad = {
        nombre: nombre.toUpperCase(),
        clase,
        perk,
        owner: userId, // Vinculamos el soldado al usuario
        equipo: "Jugador",
        hp: 100,
        hpMax: 100,
        arma_primaria,
        arma_secundaria,
        arma_melee,
        habilidad: habilidadesDB[clase] || { nombre: 'N/A' },
        creadoEn: new Date()
    };

    db.soldados.insert(nuevaUnidad, (err, doc) => {
        if (err) return res.status(500).send("ERROR DB");
        res.redirect('/ver-escuadron');
    });
});

// --- 7. SISTEMA DE BATALLAS ---
app.post('/api/batalla/unirse', (req, res) => {
    const { codigo, escuadron, nombre, userId } = req.body;

    if (!batallasActivas[codigo]) {
        batallasActivas[codigo] = {
            jugador1: { id: userId, nombre: nombre, tropas: escuadron },
            jugador2: null,
            estado: 'esperando'
        };
        return res.json({ mensaje: "SALA_CREADA", batalla: batallasActivas[codigo] });
    } else {
        if (batallasActivas[codigo].jugador2) return res.status(400).json({ mensaje: "SALA_LLENA" });
        batallasActivas[codigo].jugador2 = { id: userId, nombre: nombre, tropas: escuadron };
        batallasActivas[codigo].estado = 'listo';
        return res.json({ mensaje: "BATALLA_INICIADA", batalla: batallasActivas[codigo] });
    }
});

app.get('/api/batalla/estado/:codigo', (req, res) => {
    const batalla = batallasActivas[req.params.codigo];
    batalla ? res.json(batalla) : res.status(404).json({ mensaje: "SALA_EXPIRADA" });
});

app.delete('/api/soldado/:id', (req, res) => {
    db.soldados.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true });
    });
});

// --- 8. INICIO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVIDOR BSD CORRIENDO EN PUERTO ${PORT}`);
});
