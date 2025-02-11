import moment from "moment-timezone";
import mongoose, {model, Schema} from "mongoose";
import { type } from "os";
import { v4 as uuidv4 } from 'uuid';

const SesionSchema = new Schema({

    sessionID:{
        unique: true,
        type: String,
        default: uuidv4
    },
    email:{
        type: String,
        required: true
    },
    nickname:{
        type: String,
        required:true
    },
    createdAt: {
        type: Date,
        default: () => moment().tz('America/Mexico_City').toDate(),
        required: true
      },
      lastAccess: {
        type: Date,
        default: () => moment().tz('America/Mexico_City').toDate()
      },
    status: {
        type: String,
        enum: ["Activa", "Inactiva", "Finalizada por el usuario", "Finalizada por error"],
        required: true
    },
    clienteData: {
        ip: {type: String, required: true},
        macAddress: {type: String, required: true}
    },
    serveData:{
        Ip: {type:String, required:true},
        macAddress:{type:String, required: true}
    },
    inactivirtTime:{
        hours: { type: Number, required: true, min:0},
        minutes: {type: Number, required:true, min: 0, max:59},
        seconds:{type:Number, required: true, min:0, max:59}
    }
    //////////////////////

}
);

const Sesion = mongoose.model('Sesion',SesionSchema);
export default Sesion;

