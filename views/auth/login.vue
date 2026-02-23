<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();

const handleLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    const { data } = await axios.post('/api/auth/login', {
      username: username.value,
      password: password.value
    });

    // Guardamos el token en el navegador
    localStorage.setItem('auth_token', data.token);
    
    // Redirigimos al inicio
    router.push('/');
    
  } catch (e) {
    error.value = 'Usuario o contraseña incorrectos';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <div class="card">
        <img src="/main_logo.png" alt="Logo" class="mb-4 ml-5">
      <h1>Login</h1>
      <form @submit.prevent="handleLogin">
        <input v-model="username" type="text" placeholder="Usuario" required />
        <input v-model="password" type="password" placeholder="Contraseña" required />
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Entrando...' : 'Iniciar Sesión' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Estilos rápidos para centrar */
.login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f3f4f6; }
.card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
button { width: 100%; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }
button:disabled { opacity: 0.7; }
.error { color: red; font-size: 0.9rem; }
</style>