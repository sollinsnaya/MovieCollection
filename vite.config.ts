import { createReadStream, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = dirname(fileURLToPath(import.meta.url))
const COLLECTION_CSV = 'Movie_Collection_Master_Current.csv'
const collectionCsvPath = resolve(rootDir, COLLECTION_CSV)
const collectionCsvUrl = `/data/${COLLECTION_CSV}`

/** Serve the repo-root spreadsheet at /data/... during `vite` dev. */
function collectionCsvPlugin(): Plugin {
  return {
    name: 'collection-csv',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== collectionCsvUrl) {
          next()
          return
        }
        if (!existsSync(collectionCsvPath)) {
          res.statusCode = 404
          res.end(`Collection CSV not found at ${collectionCsvPath}`)
          return
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        createReadStream(collectionCsvPath).pipe(res)
      })
    },
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir ?? resolve(rootDir, 'dist')
      const targetDir = resolve(outDir, 'data')
      mkdirSync(targetDir, { recursive: true })
      copyFileSync(collectionCsvPath, resolve(targetDir, COLLECTION_CSV))
    },
  }
}

const devHost = process.env.SHELF_DEV_HOST || '127.0.0.1'
const devPort = Number(process.env.SHELF_DEV_PORT || 5173)
const apiPort = Number(process.env.SHELF_API_PORT || 5188)

export default defineConfig({
  plugins: [react(), collectionCsvPlugin()],
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
