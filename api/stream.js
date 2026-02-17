import axios from 'axios';
import { verificarUsuario } from './utils/auth.js';

export default async function handler(req, res) {
  try {
    verificarUsuario(req);
  } catch (error) {
    // En streams es importante cerrar la conexión si falla
    res.status(401).end();
    return;
  }
  const { file_id, title } = req.query;
  const fileName = title ? `${title}.pdf` : "pliego.pdf";
  const token = process.env.TELEGRAM_TOKEN;

  if (!file_id) {
    return res.status(400).json({ error: "Falta el file_id" });
  }

  try {
    // 1. Obtener la ruta del archivo desde Telegram
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${file_id}`);
    const data = await tgRes.json();

    if (!data.ok) {
      return res.status(404).json({ error: "Archivo no encontrado en Telegram" });
    }

    const fileUrl = `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;

    // 2. Crear el Stream usando Axios
    const response = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream',
    });

    // 3. Configurar cabeceras para que el navegador lo reconozca como PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Title', fileName);
    // 4. Tubería (Pipe): lo que llega de Telegram se envía al usuario al instante
    response.data.pipe(res);

  } catch (error) {
    console.error("Error en Stream:", error);
    res.status(500).json({ error: "Error al procesar el stream del PDF" });
  }
}