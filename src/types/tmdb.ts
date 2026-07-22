/** Client-side types for the TMDb-assisted Add Movie flow. */

export type TmdbSearchResult = {
  tmdbId: number
  title: string
  originalTitle: string
  releaseDate: string
  year: number | null
  overview: string
  posterPath: string | null
  posterThumbUrl: string | null
}

export type TmdbSearchResponse = {
  status: 'matched' | 'ambiguous' | 'none'
  match?: TmdbSearchResult
  results: TmdbSearchResult[]
  message?: string
}

export type TmdbPosterResult = {
  ok: boolean
  code?: string
  message?: string
  filename: string | null
  publicPath: string | null
  reused?: boolean
  downloaded?: boolean
}

export type TmdbMoviePrefillResponse = {
  tmdbId: number
  fields: Record<string, string>
  poster: TmdbPosterResult | null
  warnings: string[]
  meta: {
    title: string
    originalTitle: string
    releaseDate: string
    hasPoster: boolean
  }
}

export type DuplicateCandidate = {
  catalogId: string
  title: string
  year: string
  discFormat: string
  edition: string
}

export type ApiErrorBody = {
  error: string
  code?: string
}
