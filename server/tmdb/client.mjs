/**
 * TMDb HTTP client (server-only). Credentials never leave this module in responses.
 */

const TMDB_API = 'https://api.themoviedb.org/3'
const DEFAULT_TIMEOUT_MS = 12_000

export class TmdbError extends Error {
  constructor(message, { status = 502, code = 'tmdb_error', cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'TmdbError'
    this.status = status
    this.code = code
  }
}

export function resolveTmdbAuth(env = process.env) {
  const raw = (
    env.TMDB_READ_ACCESS_TOKEN ||
    env.TMDB_API_KEY ||
    ''
  )
    .trim()
    .replace(/^Bearer\s+/i, '')

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

function requireAuth(env = process.env) {
  const auth = resolveTmdbAuth(env)
  if (!auth) {
    throw new TmdbError(
      'TMDb is not configured. Add TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN to the project .env file.',
      { status: 503, code: 'missing_api_key' },
    )
  }
  return auth
}

async function tmdbFetch(path, { query = {}, env = process.env, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const auth = requireAuth(env)
  const url = new URL(`${TMDB_API}${path}`)
  auth.applyQuery(url)
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === '') continue
    url.searchParams.set(key, String(value))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(url, {
      headers: auth.headers,
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new TmdbError('TMDb request timed out. Try again in a moment.', {
        status: 504,
        code: 'timeout',
        cause: error,
      })
    }
    throw new TmdbError('Could not reach TMDb. Check the server network connection.', {
      status: 502,
      code: 'network',
      cause: error,
    })
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 401 || response.status === 403) {
    throw new TmdbError('TMDb rejected the API credentials. Check the key in .env.', {
      status: 502,
      code: 'auth_failed',
    })
  }

  if (response.status === 404) {
    throw new TmdbError('Movie not found on TMDb.', {
      status: 404,
      code: 'not_found',
    })
  }

  if (response.status === 429) {
    throw new TmdbError('TMDb rate limit reached. Wait a moment and try again.', {
      status: 429,
      code: 'rate_limited',
    })
  }

  if (!response.ok) {
    throw new TmdbError(`TMDb request failed (${response.status}).`, {
      status: 502,
      code: 'upstream_error',
    })
  }

  try {
    return await response.json()
  } catch (error) {
    throw new TmdbError('TMDb returned an invalid response.', {
      status: 502,
      code: 'invalid_response',
      cause: error,
    })
  }
}

export function normalizeTitle(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function parseYear(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const n = Number(text)
  if (!Number.isFinite(n)) return null
  const year = Math.trunc(n)
  if (year < 1800 || year > 2100) return null
  return year
}

export function yearFromReleaseDate(releaseDate) {
  if (!releaseDate || typeof releaseDate !== 'string') return null
  return parseYear(releaseDate.slice(0, 4))
}

/** Score a TMDb search hit against the query title/year (higher is better). */
export function scoreSearchMatch(result, title, year) {
  const resultTitle = normalizeTitle(result.title || result.original_title)
  const want = normalizeTitle(title)
  let score = 0

  if (!want) return 0
  if (resultTitle === want) score += 100
  else if (resultTitle.includes(want) || want.includes(resultTitle)) score += 40

  const resultYear = yearFromReleaseDate(result.release_date)
  if (year != null && resultYear === year) score += 80
  else if (year != null && resultYear != null && Math.abs(resultYear - year) === 1) score += 20

  if (result.poster_path) score += 5
  return score
}

export function toSearchResult(raw) {
  const title = String(raw.title ?? '').trim()
  const originalTitle = String(raw.original_title ?? '').trim()
  return {
    tmdbId: Number(raw.id),
    title,
    originalTitle:
      originalTitle && normalizeTitle(originalTitle) !== normalizeTitle(title)
        ? originalTitle
        : '',
    releaseDate: raw.release_date ? String(raw.release_date) : '',
    year: yearFromReleaseDate(raw.release_date),
    overview: String(raw.overview ?? '').trim(),
    posterPath: raw.poster_path ? String(raw.poster_path) : null,
    posterThumbUrl: raw.poster_path
      ? `https://image.tmdb.org/t/p/w185${raw.poster_path}`
      : null,
  }
}

/**
 * Decide whether search results are an unambiguous match, ambiguous, or empty.
 * Does not auto-pick the first result when several titles are close.
 */
export function resolveSearchResults(results, title, year) {
  const want = normalizeTitle(title)
  const ranked = [...results]
    .map((raw) => ({ raw, score: scoreSearchMatch(raw, title, year), result: toSearchResult(raw) }))
    .filter((item) => Number.isFinite(item.result.tmdbId) && item.result.tmdbId > 0)
    .sort((a, b) => b.score - a.score)

  if (ranked.length === 0) {
    return { status: 'none', results: [], message: 'No TMDb matches found for that title.' }
  }

  const tip =
    year == null
      ? 'Several titles look similar. Add a release year or TMDb ID to narrow the search.'
      : 'Several titles still look similar. Pick one below or enter the TMDb ID.'

  const ambiguous = (list) => ({
    status: 'ambiguous',
    results: list.slice(0, 12).map((item) => item.result),
    message: tip,
  })

  const matched = (item) => ({
    status: 'matched',
    match: item.result,
    results: ranked.slice(0, 12).map((entry) => entry.result),
  })

  if (ranked.length === 1 && ranked[0].score >= 40) {
    return matched(ranked[0])
  }

  const exactTitle = (item) => {
    const titles = [item.result.title, item.result.originalTitle].map(normalizeTitle).filter(Boolean)
    return titles.includes(want)
  }

  if (year != null) {
    const yearHits = ranked.filter((item) => item.result.year === year)
    const exactYearHits = yearHits.filter(exactTitle)
    if (exactYearHits.length === 1) return matched(exactYearHits[0])
    if (yearHits.length === 1 && yearHits[0].score >= 40) return matched(yearHits[0])
    if (exactYearHits.length > 1) return ambiguous(exactYearHits)
    if (yearHits.length > 1) return ambiguous(yearHits)
  }

  const exactHits = ranked.filter(exactTitle)
  if (exactHits.length === 1 && exactHits[0].score >= 100) return matched(exactHits[0])
  if (exactHits.length > 1) return ambiguous(exactHits)

  const top = ranked[0]
  const second = ranked[1]
  const clearGap = !second || top.score - second.score >= 50
  if (top.score >= 140 && clearGap) return matched(top)

  return ambiguous(ranked)
}

export async function searchMovies({ title, year, env } = {}) {
  const queryTitle = String(title ?? '').trim()
  if (!queryTitle) {
    throw new TmdbError('Title is required for TMDb search.', {
      status: 400,
      code: 'invalid_query',
    })
  }

  const parsedYear = parseYear(year)
  const data = await tmdbFetch('/search/movie', {
    query: {
      query: queryTitle,
      include_adult: 'false',
      ...(parsedYear != null ? { year: String(parsedYear) } : {}),
    },
    env,
  })

  const results = Array.isArray(data.results) ? data.results : []
  return resolveSearchResults(results, queryTitle, parsedYear)
}

export async function fetchMovieDetails(tmdbId, { env } = {}) {
  const id = Number(tmdbId)
  if (!Number.isInteger(id) || id <= 0) {
    throw new TmdbError('Invalid TMDb ID.', { status: 400, code: 'invalid_tmdb_id' })
  }

  const [movie, credits] = await Promise.all([
    tmdbFetch(`/movie/${id}`, { env }),
    tmdbFetch(`/movie/${id}/credits`, { env }),
  ])

  return { movie, credits }
}

export function posterImageUrl(posterPath, size = 'w780') {
  if (!posterPath) return null
  return `https://image.tmdb.org/t/p/${size}${posterPath}`
}
