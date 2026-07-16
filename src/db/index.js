import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectDB = async() => {
  try{
   const conectionInstance =  await mongoose.connect(`${process.env.DATABASE_URL}/${DB_NAME}`);
   console.log(`MongoDB connected!!!`, conectionInstance.connection.host)
  }
  catch(error){
    console.log('Error---',error)
    process.exit(1);
  }
}




