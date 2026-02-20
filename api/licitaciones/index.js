import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dns from 'node:dns';
import { verificarUsuario } from '../utils/auth.js'; // Importamos al guardián de autenticación

dotenv.config();

if (process.env.NODE_ENV === 'development') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const client = new MongoClient(process.env.MONGODB_URI);
let clientPromise = client.connect();

export default async function handler(req, res) {
  // --- ZONA DE SEGURIDAD ---
  try {
    verificarUsuario(req); // Si falla, salta al catch y no ejecuta nada más
  } catch (error) {
    return res.status(401).json({ message: 'Acceso denegado: Loguéate primero' });
  }
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
    // Usamos replace(/\+/g, ' ') para cambiar todos los '+' por un espacio en blanco real
    const search = (req.query.search || '').replace(/\+/g, ' ').trim();


    // 1. PRIMER RASTREADOR: ¿Qué está recibiendo realmente el servidor?
    console.log("====================================");
    console.log("1. TEXTO RECIBIDO DEL FRONTEND:", search);

    let query1 = {};
    // 3. Crear expresión regular flexible para la búsqueda (ignora espacios extra)
    if (search) {
      // Separamos las palabras y las limpiamos por seguridad
      const palabrasLimpias = search.split(/\s+/).map(word => escapeRegExp(word));
      // Las volvemos a unir con '\\s+', lo que obliga a que estén en el mismo orden exacto,
      // pero permite que haya cualquier cantidad de espacios entre ellas en la base de datos.
      const fraseExacta = palabrasLimpias.join('\\s+');
      // Usamos un solo $or para buscar la frase completa en cualquiera de los campos
      query1 = {
        $or: [
          { objeto_cont: { $regex: fraseExacta, $options: 'i' } },
          { expediente: { $regex: fraseExacta, $options: 'i' } },
          { lugar_ejecucion: { $regex: fraseExacta, $options: 'i' } }
        ]
      };
    }

    // 2. Calcular cu�ntos documentos saltar
    const skip = (page - 1) * limit;

    // 3. Ejecutar la consulta con skip y limit
    // countDocuments nos ayuda a saber el total para la paginacin frontal
    const totalLicitaciones = await coleccion.countDocuments(query1);

    const licitaciones = await coleccion
      .aggregate([
        { $match: query1 },
        // PASO 1: Normalizamos el campo 'favorite' al vuelo
        {
          $addFields: {
            // $ifNull verifica si 'favorite' existe. Si no existe o es nulo, le asigna 'false' temporalmente.
            favorite: { $ifNull: ["$favorite", false] }
          }
        },
        // PASO 2: Ordenamos los resultados
        {
          $sort: {
            favorite: -1, // Pone los 'true' (favoritos) hasta arriba
            f_publicacion: -1       // Luego ordena por fecha de publicacion descendente (las más nuevas primero). 
            // Si tienes un campo 'fecha', cámbialo aquí (ej. createdAt: -1)
          }
        }
      ])
      //.sort({ favorite: -1, f_publicacion: -1 }) // Ordenar por los más recientes y favoritos
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
