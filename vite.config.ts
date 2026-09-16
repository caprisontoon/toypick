import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages는 /<저장소명>/ 하위 경로로 서비스되므로 프로덕션 빌드에만 base를 지정합니다.
// 투네랜드에 삽입할 때는 실제 서비스 경로로 바꿔주세요. (로컬 개발은 '/')
const repoName = 'toypick'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? `/${repoName}/` : '/',
  server: { host: true },
  build: {
    // Vendor chunks: three / rapier (embedded wasm) / react rarely change,
    // so returning visitors keep them cached across app deploys
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          physics: ['@dimforge/rapier3d-compat'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
}))
