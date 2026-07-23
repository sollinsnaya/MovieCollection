/**
 * English Wikipedia MediaWiki search + film-page matching.
 * Discovers article URLs only — never scrapes page content.
 */

const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const DEFAULT_TIMEOUT_MS = 10_000
const USER_AGENT = 'ShelfMovieCollection/1.0 (local home library; wikipedia-link-discovery)'

export class WikipediaError extends Error {
  constructor(message, { status = 502, code = 'wikipedia_error', cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'WikipediaError'
    this.status = status
    this.code = code
  }
}

export function normalizeTitle(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function parseYear(value) {
  if (value == null || value === '') return null
  const n = Number(String(value).trim())
  if (!Number.isFinite(n)) return null
  const year = Math.trunc(n)
  if (year < 1800 || year > 2100) return null
  return year
}

/** Build a readable en.wikipedia.org/wiki/... URL from a MediaWiki page title. */
export function wikiPageUrlFromTitle(title) {
  const cleaned = String(title ?? '').trim().replace(/ /g, '_')
  if (!cleaned) return ''
  const encoded = encodeURIComponent(cleaned)
    .replace(/%3A/gi, ':')
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2C/gi, ',')
    .replace(/%27/gi, "'")
    .replace(/%21/gi, '!')
  return `https://en.wikipedia.org/wiki/${encoded}`
}

export function isValidWikipediaUrl(value) {
  const text = String(value ?? '').trim()
  if (!text) return false
  try {
    const url = new URL(text)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    if (host !== 'en.wikipedia.org' && host !== 'www.wikipedia.org') {
      // Allow any http(s) URL for manual entry validation elsewhere; this helper is en-wiki preferred.
      return url.protocol === 'http:' || url.protocol === 'https:'
    }
    return url.pathname.startsWith('/wiki/') && url.pathname.length > '/wiki/'.length
  } catch {
    return false
  }
}

export function isPreferredEnglishWikipediaUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim())
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname.toLowerCase() === 'en.wikipedia.org' &&
      url.pathname.startsWith('/wiki/') &&
      url.pathname.length > '/wiki/'.length
    )
  } catch {
    return false
  }
}

function looksLikeDisambiguation(title, snippet) {
  const hay = `${title} ${snippet}`.toLowerCase()
  return (
    /\(disambiguation\)/i.test(title) ||
    hay.includes('may refer to') ||
    hay.includes('disambiguation page')
  )
}

function looksUnrelated(title, snippet) {
  const hay = `${title} ${snippet}`.toLowerCase()
  const blockers = [
    'album',
    'song',
    'soundtrack',
    'novel',
    'book',
    'television series',
    'tv series',
    'video game',
    'comics',
    'manga',
    'episode',
    'character',
    'actor',
    'actress',
    'director',
    'band ',
  ]
  // Only treat as unrelated when film signals are weak.
  const filmish = /\bfilm\b|\bmovie\b|\bcinema\b/.test(hay) || /\(\d{4}.*film/.test(hay)
  if (filmish) return false
  return blockers.some((word) => hay.includes(word))
}

export function scoreWikipediaResult(result, title, year) {
  const want = normalizeTitle(title)
  const pageTitle = String(result.title ?? '')
  const snippet = String(result.snippet ?? result.description ?? '')
  const pageNorm = normalizeTitle(pageTitle)
  const hay = `${pageTitle} ${snippet}`
  const hayNorm = normalizeTitle(hay)

  let score = 0

  if (looksLikeDisambiguation(pageTitle, snippet)) return -100
  if (looksUnrelated(pageTitle, snippet)) score -= 40

  if (pageNorm === want) score += 100
  else if (pageNorm.startsWith(`${want} `) || pageNorm.includes(` ${want} `)) score += 55
  else if (pageNorm.includes(want) || want.includes(pageNorm)) score += 35

  if (year != null) {
    const yearText = String(year)
    if (pageTitle.includes(yearText) || snippet.includes(yearText)) score += 80
    // Parenthetical year-film pattern: (2012 film)
    if (new RegExp(`\\(${yearText}[^)]*film`, 'i').test(hay)) score += 40
  }

  if (/\bfilm\b/i.test(hay)) score += 35
  if (/\bmovie\b/i.test(hay)) score += 15
  if (/\(\d{4} film\)/i.test(pageTitle)) score += 25

  // Prefer exact "Title (YEAR film)" shape
  if (year != null) {
    const exact = normalizeTitle(`${title} ${year} film`)
    if (pageNorm === exact || pageNorm === normalizeTitle(`${title} (${year} film)`)) {
      score += 50
    }
  }

  return score
}

export function selectBestWikipediaMatch(results, title, year) {
  const parsedYear = parseYear(year)
  const ranked = [...results]
    .map((result) => ({
      ...result,
      score: scoreWikipediaResult(result, title, parsedYear),
      url: result.url || wikiPageUrlFromTitle(result.title),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (ranked.length === 0) {
    return {
      status: 'none',
      results: [],
      message: 'Wikipedia page could not be found automatically. You can add it manually.',
    }
  }

  const top = ranked[0]
  const second = ranked[1]
  const strong = top.score >= 150
  const clearGap = !second || top.score - second.score >= 40
  const uniqueStrong = ranked.length === 1 && top.score >= 100

  if ((strong && clearGap) || uniqueStrong) {
    return {
      status: 'matched',
      match: top,
      results: ranked.slice(0, 8),
    }
  }

  // Multiple film pages for same title / different years, etc.
  if (ranked.length > 1 && top.score >= 90) {
    return {
      status: 'ambiguous',
      results: ranked.slice(0, 8),
      message: 'Several Wikipedia articles look plausible. Pick the correct one.',
    }
  }

  if (top.score >= 120 && clearGap) {
    return {
      status: 'matched',
      match: top,
      results: ranked.slice(0, 8),
    }
  }

  return {
    status: 'ambiguous',
    results: ranked.slice(0, 8),
    message: 'Several Wikipedia articles look plausible. Pick the correct one.',
  }
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function wikiFetch(params, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const url = new URL(WIKI_API)
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    url.searchParams.set(key, String(value))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new WikipediaError('Wikipedia request timed out.', {
        status: 504,
        code: 'timeout',
        cause: error,
      })
    }
    throw new WikipediaError('Could not reach Wikipedia.', {
      status: 502,
      code: 'network',
      cause: error,
    })
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 429) {
    throw new WikipediaError('Wikipedia rate-limited the request. Try again shortly.', {
      status: 429,
      code: 'rate_limited',
    })
  }

  if (!response.ok) {
    throw new WikipediaError(`Wikipedia request failed (${response.status}).`, {
      status: 502,
      code: 'upstream_error',
    })
  }

  try {
    return await response.json()
  } catch (error) {
    throw new WikipediaError('Wikipedia returned invalid JSON.', {
      status: 502,
      code: 'invalid_response',
      cause: error,
    })
  }
}

/**
 * Search English Wikipedia for a film article matching title + year.
 */
export async function searchWikipediaMovie(title, year, options = {}) {
  const queryTitle = String(title ?? '').trim()
  if (!queryTitle) {
    throw new WikipediaError('Title is required for Wikipedia search.', {
      status: 400,
      code: 'invalid_query',
    })
  }

  const parsedYear = parseYear(year)
  const searchQuery =
    parsedYear != null ? `${queryTitle} ${parsedYear} film` : `${queryTitle} film`

  const data = await wikiFetch(
    {
      action: 'query',
      list: 'search',
      srsearch: searchQuery,
      srlimit: '8',
      srprop: 'snippet|titlesnippet',
    },
    options,
  )

  const raw = Array.isArray(data?.query?.search) ? data.query.search : []
  const results = raw.map((item) => ({
    title: String(item.title ?? '').trim(),
    snippet: stripHtml(item.snippet || item.titlesnippet || ''),
    pageId: item.pageid ?? null,
    url: wikiPageUrlFromTitle(item.title),
  }))

  return selectBestWikipediaMatch(results, queryTitle, parsedYear)
}
