import axios from 'axios';
// Si usas Vue Router, impórtalo para redirigir suavemente
// import router from '@/router'; 

const api = axios.create();

// 1. INTERCEPTOR DE PETICIONES (Ya lo tenías: inyecta el token)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 2. INTERCEPTOR DE RESPUESTAS (ESTE ES EL NUEVO CÓDIGO CLAVE)
api.interceptors.response.use(
    (response) => response, // Si todo va bien, pasa la respuesta
    (error) => {
        // Si el servidor responde con 401 (No autorizado / Token vencido)
        if (error.response && error.response.status === 401) {
            console.warn('Sesión caducada, redirigiendo al login...');

            // A. Borramos el token vencido
            localStorage.removeItem('auth_token');

            // B. Redirigimos al Login.
            // Usar window.location es más seguro aquí para limpiar toda la memoria de la App
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;