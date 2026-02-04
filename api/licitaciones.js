import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    // Según tu imagen, estos son los nombres:
    const db = client.db('licitaciones_db'); 
    const coleccion = db.collection('licitaciones'); 

    // Traemos los datos de la colección que vimos en Atlas
    const licitaciones = await coleccion.find({}).sort({ _id: -1 }).toArray();

    // Enviamos los datos que el scraper guardó
    res.status(200).json(licitaciones);
  } catch (error) {
    console.error("Error detallado:", error);
    res.status(500).json({ error: "Fallo al conectar con la base de datos", details: error.message });
  } finally {
    await client.close();
  }
}