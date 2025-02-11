import Sesion from "../models/sesions.js";


const SesionDao = {
    insert: async (sesion) => {
        try {
            return await Sesion.create(sesion);
        } catch (error) {
            console.error("❌ Error al insertar sesión en la BD:", error);
            throw new Error("Error al guardar sesión");
        }
    }
};

export default SesionDao;