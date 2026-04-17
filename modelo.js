// modelo.js

class Usuario {
    constructor(username, email, password, id) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.id_jugador = id;
        this.rol = "Jugador"; // Rol por defecto
    }
}

class Soldado {
    constructor(datos, habilidadesDB, pesoActual, slotsMax) {
        this.nombre = datos.nombre;
        this.clase = datos.clase;
        this.arma_primaria = datos.arma_primaria;
        this.arma_secundaria = datos.arma_secundaria;
        this.arma_melee = datos.arma_melee;
        this.perk = datos.perk;
        this.peso = pesoActual;
        this.slots_max = slotsMax;
        
        // Stats automáticos según la clase
        this.stats = {
            vida: 100,
            velocidad: (datos.clase === "Oficial") ? 7 : 5,
            danio_base: 15
        };

        // Asignar habilidad desde el diccionario del server
        this.habilidad = habilidadesDB[datos.clase] || { nombre: "Ninguna", desc: "N/A" };
    }
}

// ESTO ES VITAL: Si no exportas, el server no recibe nada
module.exports = { Usuario, Soldado };