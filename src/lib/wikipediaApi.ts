import type {
  WikipediaSearchResponse,
  WikipediaSource,
} from '../types/wikipedia'

export type { WikipediaSearchResponse, WikipediaSource }

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`
}

export async function searchWikipedia(options: {
  title: string
  year?: string | number | null
}): Promise<WikipediaSearchResponse> {
  const params = new URLSearchParams()
  params.set('title', options.title)
  if (options.year != null && String(options.year).trim()) {
    params.set('year', String(options.year).trim())
  }

  const response = await fetch(`/api/wikipedia/search?${params}`)
  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()) as WikipediaSearchResponse
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
