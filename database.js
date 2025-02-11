import mongoose,{mongo} from "mongoose";
mongoose.connect('mongodb+srv://GuzGuz:guzguz123$@clusterguzman.8i5k0.mongodb.net/API-AWIS4_0-230142?retryWrites=true&w=majority&appName=ClusterGuzman')
.then((db)=>console.log('Mondodb atlas conected'))
.catch((error)=>console.error(error));

export default mongoose;














