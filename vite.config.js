import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Só faz cache do "shell" do app (JS/CSS/HTML/ícones) pra abrir rápido
      // e funcionar offline — nunca das chamadas ao Supabase, que precisam
      // sempre vir da rede pra não mostrar dado desatualizado.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // O bundle principal ainda não é code-split e passa dos 2 MiB
        // padrão do Workbox — sobe o limite pra caber, sem mudar nada do
        // empacotamento em si.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'Omnifit',
        short_name: 'Omnifit',
        description: 'Acompanhe seus treinos de corrida, musculação, ciclismo, natação e HYROX em um só lugar.',
        theme_color: '#0B1220',
        background_color: '#0B1220',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: '/',
})