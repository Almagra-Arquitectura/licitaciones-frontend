import { verificarUsuario } from '../utils/auth.js';
import { ObjectId, MongoClient } from 'mongodb';
import dotenv from 'dotenv';
// Importa tu conexión a DB y Modelo
dotenv.config();

export default async function handler(req, res) {
  // 1. Solo permitimos el método PATCH
  if (req.method !== 'PATCH') return res.status(405).end();

  try {
    // 2. Seguridad
    try {
        verificarUsuario(req); // Si falla, salta al catch y no ejecuta nada más
    } catch (error) {
        return res.status(401).json({ message: 'Acceso denegado: Loguéate primero' });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    let clientPromise = client.connect();

    const connectedClient = await clientPromise;
    const db = connectedClient.db('licitaciones_db');
    const coleccion = db.collection('licitaciones');
    
    const { id, favorite } = req.body;

    // 3. Actualización en MongoDB
    // Usamos { new: true } para verificar que se actualizó
    const licitacion = await coleccion.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { favorite: !!favorite } },
      { 
        returnDocument: 'after', // Esta es la clave: devuelve el doc DESPUÉS del cambio
        includeResultMetadata: false // Para que te devuelva directamente el documento
      }
    );

    if (!licitacion) return res.status(404).json({ error: "No encontrada" });

    console.log(`Licitación ${id} actualizada a favorito: ${favorite}`);
    return res.status(200).json({ success: true, lt: licitacion });

  } catch (error) {
    return res.status(401).json({ error: "No autorizado o error de BD" });
  }
}