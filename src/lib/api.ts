import type { MovieRecord } from '../types/movie'

export type CollectionPayload = {
  columns: string[]
  rows: MovieRecord[]
  csvPath?: string
}

async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Local save API is not available on this server. Restart with `npm run dev` (API + website).',
    )
  }
  return (await response.json()) as T
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await readJson<{ error?: string }>(response)
    if (body.error) return body.error
  } catch (error) {
    if (error instanceof Error) return error.message
  }
  return `Request failed (${response.status})`
}

export async function fetchCollection(): Promise<CollectionPayload> {
  const response = await fetch('/api/movies')
  if (!response.ok) throw new Error(await readError(response))
  const payload = await readJson<CollectionPayload>(response)
  if (!Array.isArray(payload.rows) || !Array.isArray(payload.columns)) {
    throw new Error('Unexpected collection API response.')
  }
  return payload
}

export async function createMovie(fields: MovieRecord): Promise<MovieRecord> {
  const response = await fetch('/api/movies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!response.ok) throw new Error(await readError(response))
  const body = await readJson<{ row: MovieRecord }>(response)
  return body.row
}

export async function updateMovie(
  catalogId: string,
  fields: MovieRecord,
): Promise<MovieRecord> {
  const response = await fetch(`/api/movies/${encodeURIComponent(catalogId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!response.ok) throw new Error(await readError(response))
  const body = await readJson<{ row: MovieRecord }>(response)
  return body.row
}

export async function deleteMovie(catalogId: string): Promise<void> {
  const response = await fetch(`/api/movies/${encodeURIComponent(catalogId)}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error(await readError(response))
}

export async function apiAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/health')
    if (!response.ok) return false
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) return false
    const body = (await response.json()) as { ok?: boolean; service?: string }
    return body.ok === true && body.service === 'shelf-api'
  } catch {
    return false
  }
}
