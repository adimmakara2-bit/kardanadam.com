import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages'de alt klasörde çalışıyorsa (örn: kullanici.github.io/repo-adi/)
  // burayı './' yaparak göreceli yollar kullanmasını sağlıyoruz.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})