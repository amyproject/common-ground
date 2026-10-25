import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { createCommunityMiddleware } from './src/community/server.ts'
import { createHubAuth } from './server/hub-auth.ts'

const dataDirectory = process.env.COMMON_GROUND_DATA_DIR ?? resolve('.local-data')
// HUB_AUTH_DISABLED=1 opens Canopy without signing in (local design previews only).
const hubAuth = () => createHubAuth({ dataDirectory, disabled: process.env.HUB_AUTH_DISABLED === '1' })

export default defineConfig({
  plugins: [react(), {
    name: 'local-garden-community',
    configureServer(server) {
      const community = createCommunityMiddleware({
        dataDirectory,
        geometryPath: resolve('src/data/east-bay-map.json'),
        cookieName: 'common-ground-neighbor-dev',
      })
      server.middlewares.use(hubAuth())
      server.middlewares.use(community)
      server.httpServer?.once('close', () => { void community.close() })
    },
    configurePreviewServer(server) {
      const community = createCommunityMiddleware({
        dataDirectory,
        geometryPath: resolve('src/data/east-bay-map.json'),
        cookieName: 'common-ground-neighbor-preview',
      })
      server.middlewares.use(hubAuth())
      server.middlewares.use(community)
      server.httpServer.once('close', () => { void community.close() })
    },
  }],
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
  preview: { host: '127.0.0.1', port: 4180, strictPort: true },
})
