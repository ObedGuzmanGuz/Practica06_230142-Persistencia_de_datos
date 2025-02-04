import moment from "moment-timezone";
import {model, Schema} from "mongoose";
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
    createdAt:{
        type: Date,
        default: () => moment().tz('America/Mexico_cITY').toDate(),
        required: true
    },
    lastAccess:{
        type: Date,
        default: () => moment().tz('America/Mexico_cITY').toDate()
    },
    status: {
        type: String,
        enum: ["Activa", "Inactiva", "Finalizada por el usuario", "Finalizada por error"],
        required: true
    },
    clienteData: {
        ip: {type: String, required: true},
        macAddress: {type: String, required: true}
    }
    //////////////////////

},{
    versionKey:false,
    timestamps:true,
});

