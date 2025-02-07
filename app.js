import "./database.js"
import Sesion from "./models/sesions.js";
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import moment  from 'moment-timezone';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import os from 'os';



 const app= express();
 const PORT = 3500;


 app.use(cors({
    origin: 'http://localhost:3000', // Cambia esto al dominio permitido
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
    credentials: true, // Permite el uso de cookies y credenciales
    }));

//10.10.60.21 -Paco GG
//10.10.60.24 -Charly
//10.10.60.10 -Giovani

 app.use(express.json())

 app.use(express.urlencoded({extended:true}))
 
 const sessions = {}; //sirve para que se almacene las sesiones



 //configuraxion de la sesiones

 app.use(
        session({
        secret:'p4-Obed#OBGF-sessiionesHTTP',
        resave: false, 
        saveUninitialized: false, 
        cookie: {maxAge: 5*60*100}


        })
 )



 const getClientIp = (req) => {
    const ip =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket?.remoteAddress;

    return ip === "::1" ? "127.0.0.1" : ip;
};

const getServerNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return { serverIP: iface.address, serverMac: iface.mac };
            }
        }
    }
    return { serverIP: "0.0.0.0", serverMac: "00:00:00:00:00:00" };
};





// Login endpoint

app.post("/login", async (req, res) => {
    const { email, nickname, macAddress } = req.body;
  
    if (!email || !nickname || !macAddress) {
      return res.status(400).json({ message: "Se esperan campos requeridos" });
    }
    
    const sessionID = uuidv4();
    const now = moment().tz('America/Mexico_City'); 
    const serverInfo = getServerNetworkInfo(); // Se asume que esta función devuelve un objeto con la información del servidor
  
    const sessionData = {
      sessionID,
      email,
      nickname,
      status: "Activa",
      clienteData: {
        ip: serverInfo.serverIP, // Asegúrate de que esta propiedad tenga la IP correcta
        macAddress
      },
      serveData: {
        ip: getClientIp(req), // Se asume que esta función obtiene la IP del cliente
        macAddress
      },
      inactivirtTime: {
        hours: 0, 
        minutes: 0, 
        seconds: 0
      }
    };
  
    try {
      // Se guarda la sesión en la base de datos
      await Sesion.create(sessionData);
      res.status(200).json({
        message: "Se ha logeado de manera exitosa",
        sessionID,
      });
    } catch (error) {
      console.error('Error al guardar la sesión:', error);
      res.status(500).json({ message: "Error al registrar la sesión" });
    }
  });


// Logout endpoint
app.post("/logout", async(req, res) => {
    const { sessionID } = req.body;

    // Verificar que se proporcione un sessionID válido
    if (!sessionID || !sessions[sessionID]) {
        return res.status(404).json({
            message: "No se ha encontrado una sesión activa."
        });
    }

    const sesion = await Sesion.findOne({ sessionID });

    // Eliminar la sesión del almacenamiento en memoria
    delete sessions[sessionID];
    sesion.status = "Finalizada por el usuario";
    await sesion.save();
    // Intentar destruir la sesión activa
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                message: "Error al cerrar la sesión."
            });
        }

        // Confirmar el cierre exitoso de la sesión
        res.status(200).json({
            message: "Sesión cerrada exitosamente."
        });
    });
});

// Actualización de la sesión
app.post("/update", (req, res) => {
    const { sessionID, email, nickname } = req.body;

    if (!sessionID || !sessions[sessionID]) {
        return res.status(404).json({ message: "No existe una sesión activa" });
    }

    // Actualizar los datos de la sesión si se proporcionan
    if (email) sessions[sessionID].email = email;
    if (nickname) sessions[sessionID].nickname = nickname;

    // Reiniciar el tiempo de inactividad al actualizar
    sessions[sessionID].lastAccessed = moment().format('YYYY-MM-DD HH:mm:ss');

    res.status(200).json({
        message: "La sesión se ha actualizado",
        sesion: sessions[sessionID]
    });

    console.log("Sesiones activas:", sessions);
    console.log("SessionID proporcionado:", sessionID);
});

const tiemposeson = 2 * 60 * 1000; //
const calcularTiempoSesion = (sessionID) => {
    if (!sessions[sessionID]) {
        return { error: "Sesión no encontrada." };
    }

    const now = moment();
    const session = sessions[sessionID];
    const lastAccessedAt = moment(session.lastAccessed, "YYYY-MM-DD HH:mm:ss");
    const sessionStartAt = moment(session.createAt, "YYYY-MM-DD HH:mm:ss");
    const tiempoSesionActivo = now.diff(sessionStartAt, "seconds");
    const tiempoInactividad = now.diff(lastAccessedAt, "seconds");
    const tiempoExpiracion = tiemposeson / 1000; 
    const tiempoRestante = Math.max(0, tiempoExpiracion - tiempoInactividad);

    
    if (tiempoInactividad >= tiempoExpiracion) {
        delete sessions[sessionID];
        return { error: "La sesión ha expirado por inactividad." };
    }

    return {
        Duracion_sesion: ` ${formatTime(tiempoSesionActivo)}`,
        tiempoInactividad: ` ${formatTime(tiempoInactividad)}`,
        tiempoRestante: ` ${formatTime(tiempoRestante)}`
    };
};


const formatTime = (totalSeconds) => {
    const minutos = Math.floor(totalSeconds / 60);
    const segundos = totalSeconds % 60;
    return `${minutos} minutos ${segundos} segundos`;
};

// Endpoint /status para verificar el estado de la sesión
app.get("/status", async (req, res) => {
    const sessionID = req.query.sessionID;
    if (!sessionID || !sessions[sessionID]) {
        return res.status(404).json({ message: "No hay sesión activa." });
    }
    const sesion = await Sesion.findOne({ sessionID });
    const resultado = calcularTiempoSesion(sessionID);

    const now = moment();
    const lastAccess = moment(sesion.lastAccess);
    const tiempoInactividad = now.diff(lastAccess, "seconds");

    // Si supera 2 minutos, marcamos como "Inactiva"
    if (tiempoInactividad > 120) {
        sesion.status = "Inactiva";
        await sesion.save();
    }
  


    // Si la sesión expiró, devolver error y eliminarla
    if (resultado.error) {
        return res.status(408).json({ message: resultado.error });
    }

    res.status(200).json({
        message: "Estado de Sesion",
        session: sessions[sessionID],
        estado:sesion,
        horaActualCDMX: moment().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss"),
        ...resultado
    });
});


app.get('/',(req,res)=>{
    return res.status(200).json({
        message:"Bienvenido a la API de Control de sesiones",
        author:"Obed Guzman Flores"
    })
})

app.get('/sessions', (req, res) => {
    if (Object.keys(sessions).length === 0) {
        return res.status(404).json({
            message: 'No hay sesiones activas.',
        });
    }


    const now = moment();
    const sessionsWithTimeData = Object.values(sessions).map(session => {
        const sessionStart = moment(session.createAt, 'YYYY-MM-DD HH:mm:ss');
        const lastAccessed = moment(session.lastAccessed, 'YYYY-MM-DD HH:mm:ss');
        
        const tiempoSesionActivo = now.diff(sessionStart, 'seconds');
        const tiempoInactividad = now.diff(lastAccessed, 'seconds');

        const tiempoExpiracion = tiemposeson / 1000; 
        const tiempoRestante = Math.max(0, tiempoExpiracion - tiempoInactividad);
      
        return {
            ...session,
            Duracion_sesion: `${tiempoSesionActivo} segundos`,
            tiempoInactividad: `${tiempoInactividad} segundos`,
            tiempoRestante: `${formatTime(tiempoRestante)} segundos`,
        };
    });
    
    res.status(200).json({
        message: 'Sesiones activas',
        sessions: sessionsWithTimeData, 
    });
});






const verificarSesiones = async () => {
    const sesiones = await Sesion.find({ status: "Activa" });

    const now = moment();

    for (let sesion of sesiones) {
        const lastAccess = moment(sesion.lastAccess);
        const tiempoInactividad = now.diff(lastAccess, "seconds");

        if (tiempoInactividad > 300) { // Expira después de 5 minutos
            sesion.status = "Finalizada por error";
            await sesion.save();
        }
    }
};

// Ejecutamos la verificación cada 1 minuto
setInterval(verificarSesiones, 60 * 1000);




app.listen(PORT, ()=>{
    console.log(`Servidor ejecutandose en http://localhost:${PORT}`);

 })






