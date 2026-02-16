import { ObjectId, MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dns from 'node:dns';
import { verificarUsuario } from '../utils/auth.js'; // Importamos al guardián de autenticación

dotenv.config();
// IMPORTANTE: Usa la misma forma de conectar que en tu index.js
// Si usas una librería auxiliar, impórtala aquí. 
// Ejemplo genérico asumiendo que tienes una conexión global:
//import clientPromise from '../../lib/mongodb'; // AJUSTA ESTA RUTA

const client = new MongoClient(process.env.MONGODB_URI);
let clientPromise = client.connect();

export default async function handler(req, res) {
  const { id } = req.query;
  // --- ZONA DE SEGURIDAD ---
  try {
    verificarUsuario(req); // Si falla, salta al catch y no ejecuta nada más
  } catch (error) {
    return res.status(401).json({ message: 'Acceso denegado: Loguéate primero' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    
    const client = await clientPromise;
    const db = client.db("licitaciones_db"); // AJUSTA EL NOMBRE

    // Validamos que sea un ID válido de Mongo
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const licitacion = await db.collection('licitaciones').findOne({ 
      _id: new ObjectId(id)
    });

    if (!licitacion) {
      return res.status(404).json({ message: 'Licitación no encontrada' });
    }

    res.status(200).json(licitacion);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}