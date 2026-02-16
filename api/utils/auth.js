// api/utils/auth.js
import jwt from 'jsonwebtoken';

export const verificarUsuario = (req) => {
  let token = null;

  // 1. Buscamos el token en la Cabecera (Para rutas normales)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // 2. O buscamos en la URL (Para Download y Stream)
  else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    throw new Error('No se proporcionó token');
  }

  try {
    // Verificamos que sea válido y no haya expirado
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // Devuelve los datos del usuario si todo está bien
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};