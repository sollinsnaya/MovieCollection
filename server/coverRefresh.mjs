/**
 * Fill missing covers only — never overwrites existing local artwork.
 */
import { existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCollection } from './collectionStore.mjs'
import { findCoverFiles, COVERS_DIR, DIST_COVERS_DIR } from './coverUpload.mjs'
import { searchMovies, fetchMovieDetails, resolveTmdbAuth, TmdbError } from './tmdb/client.mjs'
import { downloadPoster } from './tmdb/posters.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function parseYear(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const n = Number(text)
  if (!Number.isFinite(n)) return null
  const year = Math.trunc(n)
  if (year < 1800 || year > 2100) return null
  return year
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function refreshMissingCovers({ limit = null } = {}) {
  if (!resolveTmdbAuth()) {
    throw new TmdbError(
      'TMDb is not configured. Add TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN to .env.',
      { status: 503, code: 'missing_api_key' },
    )
  }

  mkdirSync(COVERS_DIR, { recursive: true })
  const alsoWriteDirs = existsSync(join(ROOT, 'dist')) ? [DIST_COVERS_DIR] : []

  const { rows } = readCollection()
  let movies = rows
    .map((row) => ({
      catalogId: String(row['Catalog ID'] ?? '').trim(),
      title: String(row.Title ?? '').trim(),
      year: parseYear(row.Year),
    }))
    .filter((row) => row.catalogId && row.title)

  if (limit != null && Number.isFinite(limit)) {
    movies = movies.slice(0, limit)
  }

  const summary = {
    downloaded: 0,
    skippedExisting: 0,
    noMatch: 0,
    missingPoster: 0,
    errors: 0,
  }

  for (const movie of movies) {
    const existing = findCoverFiles(movie.title, movie.year, movie.catalogId, COVERS_DIR)
    if (existing.length > 0) {
      summary.skippedExisting += 1
      continue
    }

    try {
      const resolved = await searchMovies({ title: movie.title, year: movie.year })
      await sleep(200)

      let tmdbId = null
      if (resolved.status === 'matched') tmdbId = resolved.match?.tmdbId ?? resolved.match?.id
      else if (resolved.status === 'ambiguous' && resolved.results?.[0]) {
        tmdbId = resolved.results[0].tmdbId ?? resolved.results[0].id
      }

      if (!tmdbId) {
        summary.noMatch += 1
        continue
      }

      const details = await fetchMovieDetails(tmdbId)
      await sleep(150)
      const posterPath = details?.movie?.poster_path
      if (!posterPath) {
        summary.missingPoster += 1
        continue
      }

      const result = await downloadPoster({
        title: movie.title,
        year: movie.year,
        posterPath,
        force: false,
        coversDir: COVERS_DIR,
        alsoWriteDirs,
      })

      if (result.reused) summary.skippedExisting += 1
      else if (result.downloaded) summary.downloaded += 1
      else if (result.code === 'no_poster') summary.missingPoster += 1
      else summary.errors += 1
    } catch {
      summary.errors += 1
      await sleep(400)
    }
  }

  summary.message = `Downloaded ${summary.downloaded}, skipped ${summary.skippedExisting} with existing art, ${summary.noMatch} unmatched, ${summary.missingPoster} without poster, ${summary.errors} errors.`
  return summary
}
