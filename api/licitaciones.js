import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dns from 'node:dns';

dotenv.config();

if (process.env.NODE_ENV === 'development') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const client = new MongoClient(process.env.MONGODB_URI);
let clientPromise = client.connect();

export default async function handler(req, res) {
  try {
    const connectedClient = await clientPromise;
    const db = connectedClient.db('licitaciones_db'); 
    const coleccion = db.collection('licitaciones'); 

    // 1. Obtener parámetros de la query con valores por defecto
    // Usamos parseInt para asegurar que sean números
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const query1 = search ? { objeto_cont: { $regex: search, $options: 'i' } } : {};

    // 2. Calcular cuántos documentos saltar
    const skip = (page - 1) * limit;

    // 3. Ejecutar la consulta con skip y limit
    // countDocuments nos ayuda a saber el total para la paginación frontal
    const totalLicitaciones = await coleccion.countDocuments({});
    
    const licitaciones = await coleccion
      .find(query1)
      .sort({ _id: -1 }) // Ordenar por los más recientes
      .skip(skip)
      .limit(limit)
      .toArray();

    // 4. Responder con los datos y la información de paginación
    res.status(200).json({
      info: {
        total: totalLicitaciones,
        pages: Math.ceil(totalLicitaciones / limit),
        currentPage: page,
        pageSize: limit
      },
      results: licitaciones
    });

  } catch (error) {
    console.error("Error detallado:", error);
    res.status(500).json({ 
      error: "Error en el servidor", 
      details: error.message 
    });
  }
}