import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  COLLECTION_FILE_NAME,
  COLLECTION_PATH,
  emptyRow,
  nextCatalogId,
  readCollection,
  todayStamp,
  writeCollection,
} from './collectionStore.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST_DIR = join(ROOT, 'dist')

const isProduction = process.env.NODE_ENV === 'production' || process.env.SHELF_SERVE_DIST === '1'
/** Bind address: use 0.0.0.0 on a home server so other devices can connect. */
const HOST = process.env.SHELF_HOST || (isProduction ? '0.0.0.0' : '127.0.0.1')
/** Single port in production; API-only port in local dev. */
const PORT = Number(
  process.env.SHELF_PORT || (isProduction ? 3080 : process.env.SHELF_API_PORT || 5188),
)

const app = express()
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'shelf-api',
    collectionPath: COLLECTION_PATH,
    csvPath: COLLECTION_PATH,
    mode: isProduction ? 'production' : 'development',
  })
})

app.get('/api/movies', (_req, res) => {
  try {
    const { columns, rows } = readCollection()
    res.json({
      columns,
      rows,
      collectionPath: COLLECTION_PATH,
      csvPath: COLLECTION_PATH,
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

app.post('/api/movies', (req, res) => {
  try {
    const incoming = req.body?.fields
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Expected { fields: { ... } }' })
      return
    }

    const { columns, rows, sheetName } = readCollection()
    const row = emptyRow(columns)

    for (const column of columns) {
      if (incoming[column] != null) row[column] = String(incoming[column]).trim()
    }

    if (!row.Title) {
      res.status(400).json({ error: 'Title is required.' })
      return
    }

    if (!row['Catalog ID']) {
      row['Catalog ID'] = nextCatalogId(rows)
    }

    const duplicate = rows.some(
      (existing) => existing['Catalog ID'].toLowerCase() === row['Catalog ID'].toLowerCase(),
    )
    if (duplicate) {
      res.status(409).json({ error: `Catalog ID ${row['Catalog ID']} already exists.` })
      return
    }

    if (columns.includes('Sort Title') && !row['Sort Title']) {
      row['Sort Title'] = row.Title
    }
    if (columns.includes('Last Updated') && !row['Last Updated']) {
      row['Last Updated'] = todayStamp()
    }

    rows.push(row)
    const write = writeCollection(columns, rows, sheetName)
    res.status(201).json({ row, ...write })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

app.put('/api/movies/:catalogId', (req, res) => {
  try {
    const catalogId = decodeURIComponent(req.params.catalogId)
    const incoming = req.body?.fields
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Expected { fields: { ... } }' })
      return
    }

    const { columns, rows, sheetName } = readCollection()
    const index = rows.findIndex((row) => row['Catalog ID'] === catalogId)
    if (index === -1) {
      res.status(404).json({ error: `Movie ${catalogId} not found.` })
      return
    }

    const row = { ...rows[index] }
    for (const column of columns) {
      if (column === 'Catalog ID') continue
      if (Object.prototype.hasOwnProperty.call(incoming, column)) {
        row[column] = String(incoming[column] ?? '').trim()
      }
    }

    if (!row.Title) {
      res.status(400).json({ error: 'Title is required.' })
      return
    }

    if (columns.includes('Last Updated')) {
      row['Last Updated'] = todayStamp()
    }
    rows[index] = row
    const write = writeCollection(columns, rows, sheetName)
    res.json({ row, ...write })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

app.delete('/api/movies/:catalogId', (req, res) => {
  try {
    const catalogId = decodeURIComponent(req.params.catalogId)
    const { columns, rows, sheetName } = readCollection()
    const nextRows = rows.filter((row) => row['Catalog ID'] !== catalogId)
    if (nextRows.length === rows.length) {
      res.status(404).json({ error: `Movie ${catalogId} not found.` })
      return
    }
    const write = writeCollection(columns, nextRows, sheetName)
    res.json({ deleted: catalogId, ...write })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

/** Always serve the repo-root spreadsheet (not a stale dist copy). */
app.get(`/data/${COLLECTION_FILE_NAME}`, (_req, res) => {
  if (!existsSync(COLLECTION_PATH)) {
    res.status(404).type('text/plain').send(`Collection spreadsheet not found at ${COLLECTION_PATH}`)
    return
  }
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').sendFile(COLLECTION_PATH)
})

if (isProduction) {
  if (!existsSync(DIST_DIR)) {
    console.error(`Missing ${DIST_DIR}. Run "npm run build" before starting in production.`)
    process.exit(1)
  }

  app.use(express.static(DIST_DIR))

  // SPA fallback for client-side routes (/movie/..., /help, /add, …)
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    if (req.path.startsWith('/api/')) {
      next()
      return
    }
    res.sendFile(join(DIST_DIR, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

app.listen(PORT, HOST, () => {
  const where = HOST === '0.0.0.0' ? `http://<server-ip>:${PORT}` : `http://${HOST}:${PORT}`
  console.log(`Shelf listening on ${HOST}:${PORT} (${isProduction ? 'production' : 'api-only'})`)
  console.log(`Open: ${where}`)
  console.log(`Collection spreadsheet: ${COLLECTION_PATH}`)
})
