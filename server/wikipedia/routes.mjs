import { Router } from 'express'
import { searchWikipediaMovie, WikipediaError } from './client.mjs'

function sendError(res, error) {
  if (error instanceof WikipediaError) {
    res.status(error.status).json({ error: error.message, code: error.code })
    return
  }
  res.status(500).json({
    error: error instanceof Error ? error.message : 'Unexpected server error.',
    code: 'server_error',
  })
}

export function createWikipediaRouter() {
  const router = Router()

  router.get('/search', async (req, res) => {
    try {
      const title = String(req.query.title ?? '').trim()
      const year = req.query.year
      if (!title) {
        res.status(400).json({ error: 'Title is required.', code: 'invalid_query' })
        return
      }

      const outcome = await searchWikipediaMovie(title, year)
      res.json(outcome)
    } catch (error) {
      // Soft-fail shape for the Add Movie UI: never block saving.
      if (error instanceof WikipediaError && error.code !== 'invalid_query') {
        res.json({
          status: 'none',
          results: [],
          message:
            'Wikipedia page could not be found automatically. You can add it manually.',
          code: error.code,
        })
        return
      }
      sendError(res, error)
    }
  })

  return router
}
