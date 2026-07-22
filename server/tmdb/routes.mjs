import { existsSync } from 'node:fs'
import { Router } from 'express'
import { readCollection } from '../collectionStore.mjs'
import {
  fetchMovieDetails,
  parseYear,
  searchMovies,
  toSearchResult,
  TmdbError,
} from './client.mjs'
import { findTitleYearDuplicates, mapTmdbToFields } from './mapFields.mjs'
import { COVERS_DIR, DIST_COVERS_DIR, downloadPoster } from './posters.mjs'

function sendTmdbError(res, error) {
  if (error instanceof TmdbError) {
    res.status(error.status).json({
      error: error.message,
      code: error.code,
    })
    return
  }

  const message = error instanceof Error ? error.message : String(error)
  // Never leak credentials or stack traces.
  res.status(500).json({
    error: message || 'Unexpected server error.',
    code: 'server_error',
  })
}

function parseTmdbIdParam(value) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

export function createTmdbRouter() {
  const router = Router()

  router.get('/search', async (req, res) => {
    try {
      const tmdbIdRaw = String(req.query.tmdbId ?? req.query.id ?? '').trim()
      if (tmdbIdRaw) {
        const tmdbId = parseTmdbIdParam(tmdbIdRaw)
        if (tmdbId == null) {
          res.status(400).json({ error: 'Invalid TMDb ID.', code: 'invalid_tmdb_id' })
          return
        }
        const { movie } = await fetchMovieDetails(tmdbId)
        const result = toSearchResult(movie)
        res.json({
          status: 'matched',
          match: result,
          results: [result],
        })
        return
      }

      const title = String(req.query.title ?? '').trim()
      const year = req.query.year
      if (!title) {
        res.status(400).json({ error: 'Title is required when TMDb ID is not provided.', code: 'invalid_query' })
        return
      }

      const outcome = await searchMovies({ title, year })
      res.json(outcome)
    } catch (error) {
      sendTmdbError(res, error)
    }
  })

  router.get('/movie/:tmdbId', async (req, res) => {
    try {
      const tmdbId = parseTmdbIdParam(req.params.tmdbId)
      if (tmdbId == null) {
        res.status(400).json({ error: 'Invalid TMDb ID.', code: 'invalid_tmdb_id' })
        return
      }

      const download =
        String(req.query.downloadPoster ?? 'true').toLowerCase() !== 'false'
      const forcePoster = String(req.query.forcePoster ?? '').toLowerCase() === 'true'

      const { columns } = readCollection()
      const { movie, credits } = await fetchMovieDetails(tmdbId)
      const fields = mapTmdbToFields(movie, credits, columns)
      const warnings = []

      if (!fields.Director) warnings.push('No director found in TMDb credits.')
      if (!fields['Spoiler Free Summary'] && !fields['Spoiler-Free Plot Summary']) {
        warnings.push('No plot summary available from TMDb.')
      }
      if (!movie.poster_path) warnings.push('No poster is available on TMDb for this title.')

      let poster = null
      if (download && movie.poster_path) {
        const alsoWriteDirs = existsSync(DIST_COVERS_DIR) ? [DIST_COVERS_DIR] : []
        try {
          poster = await downloadPoster({
            title: fields.Title || movie.title,
            year: parseYear(fields.Year),
            posterPath: movie.poster_path,
            force: forcePoster,
            coversDir: COVERS_DIR,
            alsoWriteDirs,
          })
          if (!poster.ok) warnings.push(poster.message)
        } catch (error) {
          warnings.push(
            error instanceof TmdbError
              ? error.message
              : 'Poster download failed; movie details were still loaded.',
          )
          poster = {
            ok: false,
            code: error instanceof TmdbError ? error.code : 'poster_error',
            message: error instanceof Error ? error.message : String(error),
            filename: null,
            publicPath: null,
            reused: false,
            downloaded: false,
          }
        }
      } else if (!movie.poster_path) {
        poster = {
          ok: false,
          code: 'no_poster',
          message: 'No poster available.',
          filename: null,
          publicPath: null,
          reused: false,
          downloaded: false,
        }
      }

      res.json({
        tmdbId,
        fields,
        poster,
        warnings,
        meta: {
          title: movie.title ?? '',
          originalTitle: movie.original_title ?? '',
          releaseDate: movie.release_date ?? '',
          hasPoster: Boolean(movie.poster_path),
        },
      })
    } catch (error) {
      sendTmdbError(res, error)
    }
  })

  router.post('/movie/:tmdbId/poster', async (req, res) => {
    try {
      const tmdbId = parseTmdbIdParam(req.params.tmdbId)
      if (tmdbId == null) {
        res.status(400).json({ error: 'Invalid TMDb ID.', code: 'invalid_tmdb_id' })
        return
      }

      const force = Boolean(req.body?.force)
      const { movie } = await fetchMovieDetails(tmdbId)
      if (!movie.poster_path) {
        res.status(404).json({
          error: 'TMDb has no poster for this title.',
          code: 'no_poster',
        })
        return
      }

      const title = String(req.body?.title || movie.title || '').trim()
      const year = parseYear(req.body?.year ?? movie.release_date?.slice(0, 4))
      const alsoWriteDirs = existsSync(DIST_COVERS_DIR) ? [DIST_COVERS_DIR] : []

      const poster = await downloadPoster({
        title,
        year,
        posterPath: movie.poster_path,
        force,
        coversDir: COVERS_DIR,
        alsoWriteDirs,
      })

      res.json(poster)
    } catch (error) {
      sendTmdbError(res, error)
    }
  })

  return router
}

export function createDuplicatesRouter() {
  const router = Router()

  router.get('/duplicates', (req, res) => {
    try {
      const title = String(req.query.title ?? '').trim()
      const year = req.query.year
      if (!title) {
        res.status(400).json({ error: 'Title is required.', code: 'invalid_query' })
        return
      }

      const { rows } = readCollection()
      const matches = findTitleYearDuplicates(rows, title, year).map((row) => ({
        catalogId: row['Catalog ID'] ?? '',
        title: row.Title ?? '',
        year: row.Year ?? '',
        discFormat: row['Disc Format'] ?? '',
        edition: row.Edition ?? '',
      }))

      res.json({ duplicates: matches })
    } catch (error) {
      sendTmdbError(res, error)
    }
  })

  return router
}
