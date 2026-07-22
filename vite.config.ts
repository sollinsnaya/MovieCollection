import { createReadStream, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = dirname(fileURLToPath(import.meta.url))
const COLLECTION_FILE = 'Master Film List.xlsx'
const collectionPath = resolve(rootDir, COLLECTION_FILE)
const collectionUrl = `/data/${encodeURI(COLLECTION_FILE)}`

/** Serve the repo-root spreadsheet at /data/... during `vite` dev. */
function collectionSpreadsheetPlugin(): Plugin {
  return {
    name: 'collection-spreadsheet',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== collectionUrl && url !== `/data/${COLLECTION_FILE}`) {
          next()
          return
        }
        if (!existsSync(collectionPath)) {
          res.statusCode = 404
          res.end(`Collection spreadsheet not found at ${collectionPath}`)
          return
        }
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        createReadStream(collectionPath).pipe(res)
      })
    },
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir ?? resolve(rootDir, 'dist')
      const targetDir = resolve(outDir, 'data')
      mkdirSync(targetDir, { recursive: true })
      copyFileSync(collectionPath, resolve(targetDir, COLLECTION_FILE))
    },
  }
}

const devHost = process.env.SHELF_DEV_HOST || '127.0.0.1'
const devPort = Number(process.env.SHELF_DEV_PORT || 5173)
const apiPort = Number(process.env.SHELF_API_PORT || 5188)

export default defineConfig({
  plugins: [react(), collectionSpreadsheetPlugin()],
  server: {
    host: devHost,
    port: devPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
})
