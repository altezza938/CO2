import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/CO2/',
  define: {
    __firebase_config: '"{\\"apiKey\\":\\"mock\\",\\"authDomain\\":\\"mock\\",\\"projectId\\":\\"mock\\",\\"storageBucket\\":\\"mock\\",\\"messagingSenderId\\":\\"mock\\",\\"appId\\":\\"mock\\"}"',
    __app_id: '"co2-app"',
    __initial_auth_token: '""'
  }
})
