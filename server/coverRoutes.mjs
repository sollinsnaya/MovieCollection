import { Router } from 'express'
import {
  CoverUploadError,
  decodeDataUrlOrBase64,
  findCoverFiles,
  saveUploadedCover,
} from './coverUpload.mjs'

function sendError(res, error) {
  if (error instanceof CoverUploadError) {
    res.status(error.status).json({ error: error.message, code: error.code })
    return
  }
  res.status(500).json({
    error: error instanceof Error ? error.message : 'Unexpected server error.',
    code: 'server_error',
  })
}

export function createCoverRouter() {
  const router = Router()

  router.get('/status', (req, res) => {
    try {
      const title = String(req.query.title ?? '').trim()
      const year = req.query.year
      const catalogId = String(req.query.catalogId ?? '').trim()
      if (!title && !catalogId) {
        res.status(400).json({ error: 'Title or catalogId is required.', code: 'invalid_query' })
        return
      }

      const files = findCoverFiles(title, year, catalogId)
      const preferred = files.find((file) => file.kind === 'title') || files[0] || null
      res.json({
        exists: files.length > 0,
        files: files.map((file) => ({
          filename: file.filename,
          publicPath: file.publicPath,
          kind: file.kind,
        })),
        publicPath: preferred?.publicPath ?? null,
      })
    } catch (error) {
      sendError(res, error)
    }
  })

  router.post('/upload', (req, res) => {
    try {
      const title = String(req.body?.title ?? '').trim()
      const year = req.body?.year
      const catalogId = String(req.body?.catalogId ?? '').trim()
      const contentTypeHint = String(req.body?.contentType ?? '').trim()
      const data = req.body?.data

      if (!title) {
        res.status(400).json({ error: 'Title is required.', code: 'invalid_title' })
        return
      }

      const decoded = decodeDataUrlOrBase64(data, contentTypeHint)
      const result = saveUploadedCover({
        title,
        year,
        catalogId,
        buffer: decoded.buffer,
        contentType: decoded.contentType || contentTypeHint,
      })

      res.json(result)
    } catch (error) {
      sendError(res, error)
    }
  })

  return router
}
