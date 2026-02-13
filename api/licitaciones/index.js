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

    const escapeRegExp = (value) =>
      String(value).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

    // 1. Obtener par�metros de la query con valores por defecto
    // Usamos parseInt para asegurar que sean n�meros
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();

    const query1 = search
      ? {
          $or: [
            { objeto_cont: { $regex: escapeRegExp(search), $options: 'i' } },
            { expediente: { $regex: escapeRegExp(search), $options: 'i' } },
            { lugar_ejecucion: { $regex: escapeRegExp(search), $options: 'i' } },
            //{ importe: { $regex: escapeRegExp(search), $options: 'i' } },
            //{ fecha_fin_po: { $regex: escapeRegExp(search), $options: 'i' } },
            //{ f_publicacion: { $regex: escapeRegExp(search), $options: 'i' } },
          ],
        }
      : {};

    // 2. Calcular cu�ntos documentos saltar
    const skip = (page - 1) * limit;

    // 3. Ejecutar la consulta con skip y limit
    // countDocuments nos ayuda a saber el total para la paginaci�n frontal
    const totalLicitaciones = await coleccion.countDocuments(query1);

    const licitaciones = await coleccion
      .find(query1)
      .sort({ f_publicacion: -1 }) // Ordenar por los más recientes
      .skip(skip)
      .limit(limit)
      .toArray();

    // Mapeamos los resultados para formatear la fecha antes de enviarlos
    // const respuesta = licitaciones.map(lic => ({
    //   ...lic,
    //   f_publicacion: new Date(lic.f_publicacion).toLocaleString('es-ES', {
    //       timeZone: 'UTC',     // <--- Esto evita que la hora cambie
    //       day: '2-digit',
    //       month: '2-digit',
    //       year: 'numeric',
    //       hour: '2-digit',
    //       minute: '2-digit',
    //       second: '2-digit'
    //     }),
    //   fecha_fin_po: new Date(lic.fecha_fin_po).toLocaleString('es-ES', {
    //       timeZone: 'UTC',     // <--- Esto evita que la hora cambie
    //       day: '2-digit',
    //       month: '2-digit',
    //       year: 'numeric',
    //       hour: '2-digit',
    //       minute: '2-digit',
    //       second: '2-digit'
    //     }), 
    // }));

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
