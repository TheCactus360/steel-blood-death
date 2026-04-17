const express = require('express');
const path = require('path');
const Datastore = require('nedb'); 
const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

// --- 1. CONFIGURACIÓN DE BASE DE DATOS ---
const db = {};
db.usuarios = new Datastore({ filename: 'usuarios.db', autoload: true });
db.soldados = new Datastore({ filename: 'soldados.db', autoload: true });

// --- 2. MIDDLEWARES ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir archivos estáticos desde tus carpetas específicas
app.use(express.static(path.join(__dirname, 'CSS')));
app.use(express.static(path.join(__dirname, 'hmtl')));

// Importación de modelos (Asegúrate de que este archivo exista en /Server/modelo.js)
const { Usuario, Soldado } = require('./Server/modelo');

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

// --- 4. RUTAS DE NAVEGACIÓN (Páginas HTML) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'index.html')));
app.get('/barracas', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'barracas.html')));
app.get('/ver-escuadron', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'escuadron.html')));
app.get('/combate', (req, res) => res.sendFile(path.join(__dirname, 'hmtl', 'combate.html')));

// --- 5. API DE DATOS (JSON) ---

// Obtener escuadrón filtrado por usuario (Para que no se mezclen los personajes)
app.get('/api/escuadron/:userId', (req, res) => {
    const ownerId = req.params.userId;

    // Si por algún motivo no llega el ID, devolvemos un error o lista vacía
    if (!ownerId || ownerId === "null" || ownerId === "undefined") {
        return res.json([]);
    }

    // Buscamos en la DB solo los soldados cuyo "owner" coincida con el ID del usuario
    db.soldados.find({ owner: ownerId }, (err, lista) => {
        if (err) return res.status(500).json({ error: err });
        res.json(lista); 
    });
});

// Obtener datos de armas
app.get('/api/armas', (req, res) => res.json(armasDB));

// Generador de IA para batallas
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

// Registro de usuarios
app.post('/registrar', (req, res) => {
    const { username, password, email } = req.body;
    db.usuarios.findOne({ email: email }, (err, user) => {
        if (user) return res.status(400).send('ERROR: EMAIL YA REGISTRADO');
        db.usuarios.count({}, (err, count) => {
            const nuevoJugador = new Usuario(username, email, password, count);
            db.usuarios.insert(nuevoJugador, () => res.redirect('/'));
        });
    });
});

// --- CONFIGURACIÓN DE BATALLAS PVP ---
// Ruta para crear o unirse a una batalla (Ajustada para multijugador real)
app.post('/api/batalla/unirse', (req, res) => {
    // Recibimos userId para que el servidor sepa quién es el dueño de cada escuadrón
    const { codigo, escuadron, nombre, userId } = req.body;

    if (!batallasActivas[codigo]) {
        // JUGADOR 1: Crea la sala
        batallasActivas[codigo] = {
            jugador1: { id: userId, nombre: nombre, tropas: escuadron },
            jugador2: null,
            turno: userId, // El creador suele empezar
            estado: 'esperando'
        };
        console.log(`Sala ${codigo} creada por ${nombre} (ID: ${userId})`);
        return res.json({ mensaje: "SALA_CREADA", batalla: batallasActivas[codigo] });
    } else {
        // Validar que el Jugador 2 no sea el mismo que el Jugador 1
        if (batallasActivas[codigo].jugador1.id === userId) {
            return res.status(400).json({ error: "YA_ESTAS_EN_LA_SALA" });
        }

        // JUGADOR 2: Se une a la sala existente
        if (batallasActivas[codigo].jugador2) {
            return res.status(400).json({ error: "SALA_LLENA" });
        }
        
        batallasActivas[codigo].jugador2 = { id: userId, nombre: nombre, tropas: escuadron };
        batallasActivas[codigo].estado = 'listo';
        console.log(`${nombre} (ID: ${userId}) se ha unido a la sala ${codigo}`);
        
        return res.json({ mensaje: "BATALLA_INICIADA", batalla: batallasActivas[codigo] });
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.usuarios.findOne({ email, password }, (err, user) => {
        if (user) {
            // Este bloque reemplaza tu mensaje de texto por uno que guarda tu identidad
            res.send(`
                <div style="background: #1a1a1a; color: #ff9900; padding: 20px; text-align: center; font-family: monospace;">
                    <h1>BIENVENIDO, AGENTE: ${user.username.toUpperCase()}</h1>
                    <p>Sincronizando perfil de combate...</p>
                    <a href="/barracas" style="color: white;">ENTRAR A LAS BARRACAS</a>
                </div>
                <script>
                    // Esto guarda tu ID único en esta PC específicamente
                    localStorage.setItem('userId', '${user._id}');
                    localStorage.setItem('userName', '${user.username}');
                    
                    // Redirección automática tras guardar los datos
                    setTimeout(() => {
                        window.location.href = "/barracas";
                    }, 1500);
                </script>
            `);
        } else {
            res.status(401).send("ERROR: CREDENCIALES INVÁLIDAS");
        }
    });
});

// --- CREAR SOLDADO (BARRACAS) COMPLETO ---
app.post('/crear-soldado', (req, res) => {
    const { nombre, clase, arma_primaria, arma_secundaria, arma_melee, perk } = req.body;
    
    // 1. DETERMINAR LÍMITE DE SLOTS (Basado en Clase y Perk)
    let slotsMax = (clase === "Soldado") ? 3 : 2;
    
    // Bonus pasivo de Sobreviviente: +1 slot extra
    if (perk === "Sobreviviente") {
        slotsMax += 1;
    }

    // 2. CALCULAR PESO DEL EQUIPAMIENTO
    let pesoPrimaria = (arma_primaria !== "Ninguna" ? 2 : 0);
    let pesoSecundaria = (arma_secundaria !== "Ninguna" ? 1 : 0);
    let pesoMelee = (arma_melee !== "Ninguna" ? 1 : 0);

    let pesoTotal = pesoPrimaria + pesoSecundaria + pesoMelee;

    // 3. VALIDACIÓN DE AMBIDIEXTRO
    // Si tiene Ambidiextro, podrías permitir combinaciones especiales o 
    // simplemente validar que no exceda los slots con armas ligeras.
    if (perk === "Ambidiextro" && arma_primaria !== "Ninguna") {
        console.log(`Aviso: ${nombre} es Ambidiextro pero lleva arma pesada.`);
    }

    // 4. VERIFICAR SOBRECARGA
    if (pesoTotal > slotsMax) {
        return res.status(400).send(`
            <h1>ERROR DE RECLUTAMIENTO</h1>
            <p>La unidad ${nombre} excede su capacidad de carga (${pesoTotal}/${slotsMax}).</p>
            <a href="/barracas">VOLVER A BARRACAS</a>
        `);
    }

    // 5. PREPARAR OBJETO DE LA UNIDAD
    // Extraemos los stats de las armas de tu armasDB para guardarlos en el soldado
    const statsArmaP = armasDB[arma_primaria] || { dmg: 0 };
    const statsArmaS = armasDB[arma_secundaria] || { dmg: 0 };
    const statsArmaM = armasDB[arma_melee] || { dmg: 0 };

    // Buscamos la habilidad de clase correspondiente
    const habilidadClase = habilidadesDB[clase] || { nombre: 'N/A', desc: 'Sin habilidad', cd: 0 };

    // Creamos el registro para la DB
    const nuevaUnidad = {
        nombre: nombre.toUpperCase(),
        clase: clase,
        perk: perk,
        equipo: "Jugador",
        hp: 100,
        hpMax: 100,
        nivel: 1,
        experiencia: 0,
        
        // Armamento y Stats
        armas: {
            primaria: { nombre: arma_primaria, ...statsArmaP },
            secundaria: { nombre: arma_secundaria, ...statsArmaS },
            melee: { nombre: arma_melee, ...statsArmaM }
        },
        
        // Habilidad Activa
        habilidad: habilidadClase,
        cdActual: 0,
        
        // Datos de inventario/peso
        peso: pesoTotal,
        slots: slotsMax,
        
        // Estados temporales de combate
        estado: {
            enSigilo: false,
            marcado: false,
            defensaBuff: 0,
            dañoBuff: 0
        },
        
        creadoEn: new Date()
    };

    // 6. GUARDAR EN NEDB
    db.soldados.insert(nuevaUnidad, (err, doc) => {
        if (err) {
            console.error("Error al insertar en DB:", err);
            return res.status(500).send("ERROR CRÍTICO EN LA BASE DE DATOS");
        }
        console.log(`Unidad registrada: ${doc.nombre} [${doc.clase}] con Perk: ${doc.perk}`);
        res.redirect('/ver-escuadron');
    });
});

// Eliminar soldado (Baja voluntaria o muerte en combate)
app.post('/api/borrar-soldado/:id', (req, res) => {
    db.soldados.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true, removed: numRemoved });
    });
});

// Ruta DELETE (Estándar para muerte en combate)
app.delete('/api/soldado/:id', (req, res) => {
    db.soldados.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true, removed: numRemoved });
    });
});

// --- 7. ENCENDIDO DEL SISTEMA ---
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`SISTEMA BSD ONLINE - MODO ESCARAMUZA`);
    console.log(`PUERTO: ${PORT}`);
    console.log(`ESTADO: OPERATIVO`);
    console.log(`=========================================`);
});

app.post('/api/batalla/unirse', (req, res) => {
    const { codigo, escuadron, nombre } = req.body;

    // Si la sala no existe, la creamos (Jugador 1)
    if (!batallas[codigo]) {
        batallas[codigo] = {
            jugador1: { nombre: nombre, tropas: escuadron, listo: false },
            jugador2: { nombre: null, tropas: [], listo: false },
            estado: 'esperando'
        };
        return res.json({ mensaje: "SALA_CREADA" });
    } 

    // Si existe y falta el Jugador 2, lo unimos
    if (batallas[codigo].jugador2.nombre === null) {
        batallas[codigo].jugador2 = { nombre: nombre, tropas: escuadron, listo: false };
        return res.json({ mensaje: "BATALLA_INICIADA", batalla: batallas[codigo] });
    }

    res.status(400).json({ mensaje: "SALA_LLENA" });
});

app.post('/api/batalla/unirse', (req, res) => {
    const { codigo, escuadron, nombre } = req.body;

    // Si la sala no existe, la creamos (Jugador 1)
    if (!batallas[codigo]) {
        batallas[codigo] = {
            jugador1: { nombre: nombre, tropas: escuadron, listo: false },
            jugador2: { nombre: null, tropas: [], listo: false },
            estado: 'esperando'
        };
        return res.json({ mensaje: "SALA_CREADA" });
    } 

    // Si existe y falta el Jugador 2, lo unimos
    if (batallas[codigo].jugador2.nombre === null) {
        batallas[codigo].jugador2 = { nombre: nombre, tropas: escuadron, listo: false };
        return res.json({ mensaje: "BATALLA_INICIADA", batalla: batallas[codigo] });
    }

    res.status(400).json({ mensaje: "SALA_LLENA" });
});

app.get('/api/batalla/estado/:codigo', (req, res) => {
    const batalla = batallas[req.params.codigo];
    if (batalla) {
        res.json(batalla); // Envía todo el objeto, incluyendo el .estado
    } else {
        res.status(404).json({ mensaje: "SALA_EXPIRADA" });
    }
});
