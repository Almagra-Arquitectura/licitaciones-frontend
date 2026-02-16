// api/auth/login.js
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  // Validamos contra las variables de entorno
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    
    // Creamos el token (dura 24 horas)
    const token = jwt.sign({ user: username }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    return res.status(200).json({ token });
  }

  return res.status(401).json({ message: 'Credenciales inválidas' });
}