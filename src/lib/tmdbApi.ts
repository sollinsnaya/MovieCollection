import type {
  ApiErrorBody,
  DuplicateCandidate,
  TmdbMoviePrefillResponse,
  TmdbPosterResult,
  TmdbSearchResponse,
} from '../types/tmdb'

async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error('Local API is not available. Restart with npm start or npm run dev.')
  }
  return (await response.json()) as T
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await readJson<ApiErrorBody>(response)
    if (body.error) return body.error
  } catch {
    // fall through
  }
  return `Request failed (${response.status})`
}

export async function searchTmdb(options: {
  title?: string
  year?: string
  tmdbId?: string
}): Promise<TmdbSearchResponse> {
  const params = new URLSearchParams()
  if (options.tmdbId?.trim()) params.set('tmdbId', options.tmdbId.trim())
  if (options.title?.trim()) params.set('title', options.title.trim())
  if (options.year?.trim()) params.set('year', options.year.trim())

  const response = await fetch(`/api/tmdb/search?${params}`)
  if (!response.ok) throw new Error(await readError(response))
  return readJson<TmdbSearchResponse>(response)
}

export async function fetchTmdbMovie(
  tmdbId: number,
  options: { downloadPoster?: boolean; forcePoster?: boolean } = {},
): Promise<TmdbMoviePrefillResponse> {
  const params = new URLSearchParams()
  if (options.downloadPoster === false) params.set('downloadPoster', 'false')
  if (options.forcePoster) params.set('forcePoster', 'true')
  const query = params.toString()
  const response = await fetch(
    `/api/tmdb/movie/${encodeURIComponent(String(tmdbId))}${query ? `?${query}` : ''}`,
  )
  if (!response.ok) throw new Error(await readError(response))
  return readJson<TmdbMoviePrefillResponse>(response)
}

export async function downloadTmdbPoster(
  tmdbId: number,
  options: { title?: string; year?: string; force?: boolean } = {},
): Promise<TmdbPosterResult> {
  const response = await fetch(`/api/tmdb/movie/${encodeURIComponent(String(tmdbId))}/poster`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: options.title,
      year: options.year,
      force: Boolean(options.force),
    }),
  })
  if (!response.ok) throw new Error(await readError(response))
  return readJson<TmdbPosterResult>(response)
}

export async function findDuplicates(title: string, year?: string): Promise<DuplicateCandidate[]> {
  const params = new URLSearchParams({ title })
  if (year?.trim()) params.set('year', year.trim())
  const response = await fetch(`/api/movies/duplicates?${params}`)
  if (!response.ok) throw new Error(await readError(response))
  const body = await readJson<{ duplicates: DuplicateCandidate[] }>(response)
  return body.duplicates ?? []
}
