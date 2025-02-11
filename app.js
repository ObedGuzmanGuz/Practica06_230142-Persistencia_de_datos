import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import bodyParser from 'body-parser';
import moment  from 'moment-timezone';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import os from 'os';
import './database.js'
import Sesion from './models/sesions.js';


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
                // Cambiar los nombres de las propiedades para coincidir con el esquema
                return { Ip: iface.address, macAddress: iface.mac };
            }
        }
    }
    // Valores predeterminados con las claves correctas
    return { Ip: "0.0.0.0", macAddress: "00:00:00:00:00:00" };
};

// Login endpoint

app.post("/login", async (req, res) => {
    const { email, nickname, macAddress } = req.body;

    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: "Se esperan campos requeridos" });
    }

    const sessionID = uuidv4();
    const now = moment().tz('America/Mexico_City');
    let ipclient = getClientIp(req);
    ipclient = ipclient.replace('::ffff:', '');

    console.log(ipclient);

    // Crear los datos para la nueva sesión
    const newSessionData = {
        sessionID,
        email,
        nickname,
        createdAt: now.toDate(),
        lastAccess: now.toDate(),
        status: "Activa", // Aquí puedes definir el estado inicial
        clienteData: {
            ip: ipclient,
            macAddress,
        },
        serveData: getServerNetworkInfo(),
        inactivirtTime: {
            hours: 0,
            minutes: 0,
            seconds: 0,
        },
    };

    // Guardar la nueva sesión en la base de datos utilizando insertOne
    try {
        const result = await mongoose.connection.db.collection('sesions').insertOne(newSessionData);

        if (result.acknowledged) {
            res.status(200).json({
                message: "Se ha logeado de manera exitosa",
                sessionID,
            });
        } else {
            throw new Error("No se pudo registrar la sesión");
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al registrar la sesión" });
    }


    console.log("Datos recibidos:", newSessionData);
});




// Logout endpoint

app.post("/logout", async (req, res) => {
    const { sessionID } = req.body;
    
    if (!sessionID) {
        return res.status(400).json({ message: "Se requiere un sessionID." });
    }

    try {
        const session = await Sesion.findOne({ sessionID });

        // 📌 Si la sesión no existe o ya está inactiva, no permitir el logout
        if (!session) {
            return res.status(404).json({ message: "La sesión ya expiro o no existeeee :(" });
        }
        if (session.status !== "Activa") {
            return res.status(403).json({ message: "No puedes cerrar una sesion que ya se expirooooo" });
        }

        // Actualizar el estado de la sesión a "Finalizada por el usuario"
        const updateData = {
            status: "Finalizada por el usuario", 
            lastAccess: moment().tz("America/Mexico_City").toDate()
        };
        await Sesion.updateOne({ sessionID }, { $set: updateData });

        // Eliminar la sesión de Express
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: "Error al cerrar la sesión." });
            }
            res.status(200).json({ message: "Sesión cerrada exitosamente." });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al cerrar la sesión." });
    }
});

app.post("/update", async (req, res) => {
    const { sessionID, email, nickname, status } = req.body;

    if (!sessionID) {
        return res.status(400).json({ message: "Se requiere un sessionID." });
    }

    try {
        // Buscar la sesión en la base de datos
        const session = await Sesion.findOne({ sessionID });

        if (!session) {
            return res.status(404).json({ message: "No se ha encontrado una sesión activa." });
        }

        const now = moment().tz("America/Mexico_City");
        const lastAccessedAt = moment(session.lastAccess);
        const tiempoInactividad = now.diff(lastAccessedAt, "seconds");
        const tiempoExpiracion = tiemposeson / 1000; // Tiempo en segundos

        // Si la sesión ha expirado, rechazar la actualización
        if (tiempoInactividad >= tiempoExpiracion) {
            await Sesion.updateOne({ sessionID }, { $set: { status: "Inactiva" } });
            return res.status(403).json({ message: "No se puede actualizar la sesión porque ha expirado por inactividad." });
        }

        // Convertir tiempo de inactividad en horas, minutos y segundos
        const horas = Math.floor(tiempoInactividad / 3600);
        const minutos = Math.floor((tiempoInactividad % 3600) / 60);
        const segundos = tiempoInactividad % 60;

        const updateData = {
            lastAccess: now.toDate(),
            inactivirtTime: { hours: horas, minutes: minutos, seconds: segundos }
        };

        if (email) updateData.email = email;
        if (nickname) updateData.nickname = nickname;
        if (status) updateData.status = status;

        await Sesion.updateOne({ sessionID }, { $set: updateData });

        res.status(200).json({
            message: "La sesión se ha actualizado con éxito.",
            updatedSession: updateData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar la sesión." });
    }
});



const tiemposeson = 1 * 60 * 1000; //
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

app.get("/status", async (req, res) => {
    const sessionID = req.query.sessionID;

    if (!sessionID) {
        return res.status(400).json({ message: "No se proporciono un sessionID." });
    }

    try {
        const session = await Sesion.findOne({ sessionID });

        if (!session) {
            return res.status(404).json({ message: "No se ha encontrado una sesión activa." });
        }

        const now = moment();
        const lastAccessedAt = moment(session.lastAccess);
        const sessionStartAt = moment(session.createdAt);
        const tiempoSesionActivo = now.diff(sessionStartAt, "seconds");
        const tiempoInactividad = now.diff(lastAccessedAt, "seconds");
        const tiempoRestante = Math.max(0, tiemposeson / 1000 - tiempoInactividad);

        // Si la sesión ha expirado
        if (tiempoInactividad >= tiemposeson / 1000) {
            await Sesion.updateOne({ sessionID }, { $set: { status: "Inactiva" } });
            return res.status(408).json({ message: "La sesión ha expirado por inactividad" });
        }

        // Crear una copia de la sesión sin inactivirtTime
        const { inactivirtTime, ...sessionData } = session.toObject();

        // Devolver los datos de la sesión sin inactivirtTime
        res.status(200).json({
            message: "Sesión activa",
            session: sessionData,
            horaActualCDMX: moment().tz("America/Mexico_City").format("YYYY-MM-DD HH:mm:ss"),
            Duracion_sesion: formatTime(tiempoSesionActivo),
            tiempoInactividad: formatTime(tiempoInactividad),
            tiempoRestante: formatTime(tiempoRestante),
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al verificar el estado de la sesión." });
    }
});


app.get('/sessions', async (req, res) => {
    try {
        // Recuperar todas las sesiones desde la base de datos
        const sessions = await Sesion.find({});

        if (sessions.length === 0) {
            return res.status(404).json({
                message: 'No hay sesiones registradas.',
            });
        }

        const now = moment();

        // Filtrar sesiones inactivas basadas en el tiempo de inactividad
        const sessionsWithTimeData = sessions.map(session => {
            const sessionStart = moment(session.createdAt);
            const lastAccessed = moment(session.lastAccess);
            
            const tiempoSesionActivo = now.diff(sessionStart, 'seconds');
            const tiempoInactividad = now.diff(lastAccessed, 'seconds');
            const tiempoExpiracion = tiemposeson / 1000; 
            const tiempoRestante = Math.max(0, tiempoExpiracion - tiempoInactividad);

            // Si la sesión ha expirado, actualizar el estado y eliminarla si es necesario
            if (tiempoInactividad >= tiempoExpiracion) {
                session.status = "Inactiva"; // Cambiar estado a inactiva
                session.lastAccess = now.toDate(); // Actualizar la hora de acceso
                session.save(); // Guardar los cambios en la base de datos
            }

            return {
                ...session.toObject(),
                Duracion_sesion: `${tiempoSesionActivo} segundos`,
                tiempoInactividad: `${formatTime(tiempoInactividad)} `,
                tiempoRestante: `${formatTime(tiempoRestante)} `,
            };
        });

        res.status(200).json({
            message: 'Sesiones recuperadas',
            sessions: sessionsWithTimeData,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al recuperar las sesiones.' });
    }
});

// Endpoint /allCurrentSessions para recuperar todas las sesiones activas
app.get('/allCurrentSessions', async (req, res) => {
    try {
        const now = moment();
        const sessions = await Sesion.find({ status: "Activa" });

        
        const activeSessions = [];

        for (const session of sessions) {
            const lastAccessed = moment(session.lastAccess);
            const tiempoInactividad = now.diff(lastAccessed, 'seconds');
            const tiempoExpiracion = tiemposeson / 1000;

           
            if (tiempoInactividad >= tiempoExpiracion) {
                
                await Sesion.updateOne(
                    { _id: session._id },
                    { $set: { status: "Inactiva", lastAccess: now.toDate() } }
                );
            } else {
                // Agregar sesiones no expiradas al array de sesiones activas
                activeSessions.push(session);
            }
        }

        if (activeSessions.length === 0) {
            return res.status(404).json({
                message: 'No hay sesiones activas.',
            });
        }

        const sessionsWithTimeData = activeSessions.map(session => {
            const sessionStart = moment(session.createdAt);
            const lastAccessed = moment(session.lastAccess);

            const tiempoSesionActivo = now.diff(sessionStart, 'seconds');
            const tiempoInactividad = now.diff(lastAccessed, 'seconds');
            const tiempoExpiracion = tiemposeson / 1000;
            const tiempoRestante = Math.max(0, tiempoExpiracion - tiempoInactividad);

            return {
                ...session.toObject(),
                Duracion_sesion: `${tiempoSesionActivo} segundos`,
                tiempoInactividad: `${formatTime(tiempoInactividad)} `,
                tiempoRestante: `${formatTime(tiempoRestante)} `,
            };
        });

        res.status(200).json({
            message: 'Sesiones activas recuperadas.',
            sessions: sessionsWithTimeData,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al recuperar las sesiones activas.' });
    }
});




app.delete('/deleteAllSessions', async (req, res) => {
    try {
       
        const result = await Sesion.deleteMany({});

        if (result.deletedCount > 0) {
            res.status(200).json({
                message: 'Todas las sesiones han sido eliminadas',
            });
        } else {
            res.status(404).json({
                message: 'No se encontraron sesiones para eliminar',
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error al eliminar las sesiones.',
        });
    }
});


app.get('/',(req,res)=>{
    return res.status(200).json({
        message:"Bienvenido a la API de Control de sesiones",
        author:"Obed Guzman Flores"
    })
})
app.listen(PORT, ()=>{
    console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
 })






