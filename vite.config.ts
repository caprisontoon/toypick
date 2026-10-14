import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 배포 경로(base)
 * - 기본값은 '/' — Vercel · 투네랜드처럼 도메인 루트(또는 자체 경로)로 서비스하는 환경
 * - GitHub Pages처럼 하위 경로로 서비스할 때만 VITE_BASE_PATH로 지정합니다. (예: /toypick/)
 */
const basePath = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base: basePath,
  server: { host: true },
  build: {
    // Vendor chunks: three / rapier (embedded wasm) / react rarely change,
    // so returning visitors keep them cached across app deploys
    rollupOptions: {
      // index.html: 투네이션 도네이터 홈(첫 화면) · game.html: 인형뽑기 게임 (홈의 '투네 랜드' 메뉴에서 iframe으로 표시)
      input: {
        main: resolve(__dirname, 'index.html'),
        game: resolve(__dirname, 'game.html'),
      },
      output: {
        manualChunks: {
          three: ['three'],
          physics: ['@dimforge/rapier3d-compat'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
