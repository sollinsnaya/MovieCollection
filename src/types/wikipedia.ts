export type WikipediaResult = {
  title: string
  snippet: string
  url: string
  pageId?: number | null
  score?: number
}

export type WikipediaSearchResponse = {
  status: 'matched' | 'ambiguous' | 'none'
  match?: WikipediaResult
  results: WikipediaResult[]
  message?: string
  code?: string
}

export type WikipediaSource = 'automatic' | 'selected' | 'manual' | 'not-found' | null
