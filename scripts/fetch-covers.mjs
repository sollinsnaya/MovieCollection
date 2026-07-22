#!/usr/bin/env node
/**
 * Download TMDb posters for each title in the collection spreadsheet.
 *
 * Usage:
 *   1. Copy .env.example → .env and set TMDB_API_KEY
 *   2. npm run fetch-covers
 *
 * Options:
 *   --force     Re-download even if a cover file already exists
 *   --limit N   Process only the first N rows (for testing)
 *   --dry-run   Show matches without downloading
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import * as XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const COLLECTION_PATH = join(ROOT, 'Master Film List.xlsx')
const COVERS_DIR = join(ROOT, 'public/covers')
const REPORT_PATH = join(COVERS_DIR, 'fetch-report.json')
const TMDB_SEARCH = 'https://api.themoviedb.org/3/search/movie'
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500'

/**
 * TMDb accepts either:
 * - API Key (v3): short string → ?api_key=
 * - API Read Access Token (v4): JWT starting with eyJ → Authorization: Bearer
 */
function resolveTmdbAuth() {
  const raw = (
    process.env.TMDB_READ_ACCESS_TOKEN ||
    process.env.TMDB_API_KEY ||
    ''
  ).trim().replace(/^Bearer\s+/i, '')

  if (!raw) return null

  if (raw.startsWith('eyJ')) {
    return {
      mode: 'bearer',
      headers: {
        Authorization: `Bearer ${raw}`,
        Accept: 'application/json',
      },
      applyQuery() {},
    }
  }

  return {
    mode: 'api_key',
    headers: { Accept: 'application/json' },
    applyQuery(url) {
      url.searchParams.set('api_key', raw)
    },
  }
}

function formatFetchError(error, context) {
  const base = error instanceof Error ? error.message : String(error)
  const cause = error instanceof Error ? error.cause : null
  const causeCode = cause && typeof cause === 'object' && 'code' in cause ? cause.code : null
  const causeMsg =
    cause instanceof Error ? cause.message : cause ? String(cause) : null
  const details = [causeCode, causeMsg].filter(Boolean).join(' — ')
  return details ? `${context}: ${base} (${details})` : `${context}: ${base}`
}

function loadEnvFile() {
  const envPath = join(ROOT, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

function parseArgs(argv) {
  const opts = { force: false, dryRun: false, limit: null }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--force') opts.force = true
    else if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--limit') {
      opts.limit = Number(argv[i + 1])
      i += 1
    }
  }
  return opts
}

function sanitizeCoverTitle(title) {
  return String(title ?? '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
}

function coverFileStem(title, year) {
  const safeTitle = sanitizeCoverTitle(title)
  if (!safeTitle) return ''
  if (year != null && Number.isFinite(year)) return `${safeTitle} (${year})`
  return safeTitle
}

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

function normalizeTitle(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function scoreMatch(result, title, year) {
  const resultTitle = normalizeTitle(result.title || result.original_title)
  const want = normalizeTitle(title)
  let score = 0

  if (resultTitle === want) score += 100
  else if (resultTitle.includes(want) || want.includes(resultTitle)) score += 40

  const resultYear = parseYear((result.release_date || '').slice(0, 4))
  if (year != null && resultYear === year) score += 80
  else if (year != null && resultYear != null && Math.abs(resultYear - year) === 1) score += 20

  if (result.poster_path) score += 5
  return score
}

async function searchTmdb(auth, title, year) {
  const url = new URL(TMDB_SEARCH)
  auth.applyQuery(url)
  url.searchParams.set('query', title)
  url.searchParams.set('include_adult', 'false')
  if (year != null) url.searchParams.set('year', String(year))

  let response
  try {
    response = await fetch(url, { headers: auth.headers })
  } catch (error) {
    throw new Error(formatFetchError(error, 'Network error talking to TMDb'))
  }

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = body.status_message ? ` — ${body.status_message}` : ''
    } catch {
      // ignore JSON parse failures
    }
    throw new Error(`TMDb search failed (${response.status}) for "${title}"${detail}`)
  }
  const data = await response.json()
  const results = Array.isArray(data.results) ? data.results : []
  if (results.length === 0) return null

  const ranked = [...results].sort(
    (a, b) => scoreMatch(b, title, year) - scoreMatch(a, title, year),
  )
  const best = ranked[0]
  if (scoreMatch(best, title, year) < 40) return null
  return best
}

async function downloadPoster(posterPath, destPath) {
  let response
  try {
    response = await fetch(`${TMDB_IMAGE}${posterPath}`)
  } catch (error) {
    throw new Error(formatFetchError(error, 'Network error downloading poster'))
  }
  if (!response.ok) {
    throw new Error(`Poster download failed (${response.status})`)
  }
  if (!response.body) throw new Error('Empty poster response body')
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destPath))
}

function loadMovies() {
  if (!existsSync(COLLECTION_PATH)) {
    throw new Error(`Spreadsheet not found: ${COLLECTION_PATH}`)
  }
  const workbook = XLSX.read(readFileSync(COLLECTION_PATH), {
    type: 'buffer',
    cellDates: true,
  })
  const sheetName = workbook.SheetNames.includes('Master Collection')
    ? 'Master Collection'
    : workbook.SheetNames[0]
  if (!sheetName) throw new Error('Workbook has no sheets.')

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  })

  return rows
    .map((row) => ({
      catalogId: String(row['Catalog ID'] ?? '').trim(),
      title: String(row.Title ?? '').trim(),
      year: parseYear(row.Year),
    }))
    .filter((row) => row.catalogId && row.title)
}

async function main() {
  loadEnvFile()
  const opts = parseArgs(process.argv.slice(2))
  const auth = resolveTmdbAuth()

  if (!auth) {
    console.error('Missing TMDB credentials in .env')
    console.error('Use either:')
    console.error('  TMDB_API_KEY=<v3 API Key>')
    console.error('  TMDB_READ_ACCESS_TOKEN=<API Read Access Token / JWT>')
    console.error('Get them at https://www.themoviedb.org/settings/api')
    process.exit(1)
  }

  console.log(`Auth mode: ${auth.mode === 'bearer' ? 'Bearer token (Read Access Token)' : 'API key'}`)

  // Connectivity check before processing the whole collection.
  try {
    const probe = await searchTmdb(auth, 'The Matrix', 1999)
    if (!probe) {
      console.warn('Warning: TMDb responded but probe search returned no match.')
    } else {
      console.log(`TMDb OK — probe matched "${probe.title}"`)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    console.error('\nCould not reach TMDb. Check your internet connection and API credentials.')
    process.exit(1)
  }

  mkdirSync(COVERS_DIR, { recursive: true })
  let movies = loadMovies()
  if (opts.limit != null && Number.isFinite(opts.limit)) {
    movies = movies.slice(0, opts.limit)
  }

  const report = {
    startedAt: new Date().toISOString(),
    authMode: auth.mode,
    downloaded: [],
    skippedExisting: [],
    missingPoster: [],
    noMatch: [],
    errors: [],
  }

  console.log(`Processing ${movies.length} titles…`)

  for (const movie of movies) {
    const stem = coverFileStem(movie.title, movie.year)
    if (!stem) {
      report.errors.push({ catalogId: movie.catalogId, error: 'Empty title after sanitize' })
      continue
    }

    const destPath = join(COVERS_DIR, `${stem}.jpg`)
    const label = `${movie.title}${movie.year ? ` (${movie.year})` : ''}`

    if (!opts.force && existsSync(destPath)) {
      report.skippedExisting.push({ catalogId: movie.catalogId, file: `${stem}.jpg` })
      console.log(`skip  ${label}`)
      continue
    }

    try {
      const match = await searchTmdb(auth, movie.title, movie.year)
      await sleep(250)

      if (!match) {
        report.noMatch.push({ catalogId: movie.catalogId, title: movie.title, year: movie.year })
        console.log(`miss  ${label}`)
        continue
      }

      if (!match.poster_path) {
        report.missingPoster.push({
          catalogId: movie.catalogId,
          title: movie.title,
          tmdbId: match.id,
        })
        console.log(`none  ${label} → TMDb #${match.id} (no poster)`)
        continue
      }

      if (opts.dryRun) {
        report.downloaded.push({
          catalogId: movie.catalogId,
          file: `${stem}.jpg`,
          tmdbId: match.id,
          tmdbTitle: match.title,
          dryRun: true,
        })
        console.log(`dry   ${label} → ${match.title} (${(match.release_date || '').slice(0, 4)})`)
        continue
      }

      await downloadPoster(match.poster_path, destPath)
      report.downloaded.push({
        catalogId: movie.catalogId,
        file: `${stem}.jpg`,
        tmdbId: match.id,
        tmdbTitle: match.title,
      })
      console.log(`ok    ${label} → ${stem}.jpg`)
      await sleep(150)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      report.errors.push({ catalogId: movie.catalogId, title: movie.title, error: message })
      console.error(`err   ${label}: ${message}`)
      await sleep(500)
    }
  }

  report.finishedAt = new Date().toISOString()
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))

  console.log('\nDone.')
  console.log(`  downloaded: ${report.downloaded.length}`)
  console.log(`  skipped:    ${report.skippedExisting.length}`)
  console.log(`  no match:   ${report.noMatch.length}`)
  console.log(`  no poster:  ${report.missingPoster.length}`)
  console.log(`  errors:     ${report.errors.length}`)
  console.log(`Report: ${REPORT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
