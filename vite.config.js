import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Servido em https://gmaiaa.github.io/omnifit-app/ pelo GitHub Pages — os
// assets precisam desse prefixo no build de produção. Em dev o base
// continua "/" para não afetar o servidor local.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/omnifit-app/' : '/',
  plugins: [react(), tailwindcss()],
}))