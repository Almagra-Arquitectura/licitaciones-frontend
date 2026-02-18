import { verificarUsuario } from './utils/auth.js';
import axios from 'axios';

export default async function handler(req, res) {
  const { file_id, title } = req.query; // Recibes el ID desde el botón de Vue
  const fileName = title ? `${title}.pdf` : "pliego.pdf";
  const token = process.env.TELEGRAM_TOKEN;
  // --- ZONA DE SEGURIDAD ---
  try {
    verificarUsuario(req); // El guardián buscará automáticamente en req.query.token
  } catch (error) {
    return res.status(401).send('No autorizado'); // Texto plano porque es una descarga
  }

  if (!file_id) {
    return res.status(400).json({ error: "Falta el file_id" });
  }

  try {
    // 1. Pedir a Telegram el path del archivo
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${file_id}`);
    const data = await tgRes.json();
    //console.log("Respuesta de Telegram:", data); // Para depuración
    if (data.ok) {
      const filePath = data.result.file_path;
      // 2. Construir la URL real de los servidores de Telegram
      const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
      
      // 3. Obtenemos el archivo como Stream (flujo de datos)
      const response = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'stream',
      });

      // 4. EL TRUCO: Forzamos el nombre en la cabecera
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );

      // 5. Enviamos los datos
      response.data.pipe(res);
      // 3. Redirigir al usuario directamente para que empiece la descarga
      //res.redirect(downloadUrl);
    } else {
      res.status(404).json({ error: "El archivo ya no existe en Telegram" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al conectar con la API de Telegram" });
  }
}