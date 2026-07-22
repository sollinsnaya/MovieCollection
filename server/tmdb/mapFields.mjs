/**
 * Map TMDb movie + credits into existing spreadsheet columns only.
 * Never invent physical-edition data or ratings.
 */

/** Columns that describe the physical disc / manual curation — never filled from TMDb. */
export const MANUAL_PHYSICAL_FIELDS = Object.freeze([
  'Catalog ID',
  'Edition',
  'Steelbook',
  'Disc Format',
  'HDR10',
  'HDR10+',
  'Dolby Vision',
  'Dolby Atmos',
  'Dolby True HD',
  'DTS:X',
  'DTS-HD  MA',
  '7.1',
  '5.1',
  'Boutique Label',
  'Rotten Tomatoes Critic Score',
  'Notes',
  'Verification Status',
  'Source Reference',
  'Last Updated',
])

/** Movie-metadata columns we may fill from TMDb when present in the sheet. */
export const TMDB_MAPPABLE_FIELDS = Object.freeze([
  'Title',
  'Sort Title',
  'Year',
  'Director',
  'Runtime (min)',
  'Genre',
  'Studio/Distributor',
  'Franchise',
  'Franchise/Collection',
  'Spoiler Free Summary',
  'Spoiler-Free Plot Summary',
  'Country',
  'Original Language',
  'Tagline',
  'TMDb ID',
  'IMDb ID',
  'Status',
  'Spoken Languages',
  'Cast',
  'Release Date',
  'Original Title',
])

function joinNames(items, key = 'name', separator = '; ') {
  if (!Array.isArray(items)) return ''
  return items
    .map((item) => String(item?.[key] ?? '').trim())
    .filter(Boolean)
    .join(separator)
}

export function extractDirectors(credits) {
  const crew = Array.isArray(credits?.crew) ? credits.crew : []
  const directors = crew
    .filter((person) => String(person?.job ?? '').trim().toLowerCase() === 'director')
    .map((person) => String(person?.name ?? '').trim())
    .filter(Boolean)
  // Preserve order, unique names
  return [...new Set(directors)].join('; ')
}

export function extractYear(movie) {
  const date = String(movie?.release_date ?? '').trim()
  if (!date) return ''
  const year = Number(date.slice(0, 4))
  if (!Number.isFinite(year) || year < 1800 || year > 2100) return ''
  return String(Math.trunc(year))
}

/**
 * Build a partial spreadsheet row from TMDb details.
 * Only includes keys that exist in `columns` (when provided).
 * Never includes ratings or physical-edition guesses.
 */
export function mapTmdbToFields(movie, credits, columns = null) {
  const columnSet = columns ? new Set(columns) : null
  const allow = (name) => !columnSet || columnSet.has(name)

  const title = String(movie?.title ?? '').trim()
  const originalTitle = String(movie?.original_title ?? '').trim()
  const overview = String(movie?.overview ?? '').trim()
  const tagline = String(movie?.tagline ?? '').trim()
  const runtime = movie?.runtime
  const runtimeText =
    typeof runtime === 'number' && Number.isFinite(runtime) && runtime > 0
      ? String(Math.round(runtime))
      : ''

  const genres = joinNames(movie?.genres, 'name', '; ')
  const studios = joinNames(movie?.production_companies, 'name', '; ')
  const countries = joinNames(movie?.production_countries, 'name', '; ')
  const spoken = joinNames(movie?.spoken_languages, 'english_name', '; ')
  const franchise = String(movie?.belongs_to_collection?.name ?? '').trim()
  const directors = extractDirectors(credits)
  const year = extractYear(movie)
  const releaseDate = String(movie?.release_date ?? '').trim()
  const status = String(movie?.status ?? '').trim()
  const originalLanguage = String(movie?.original_language ?? '').trim()
  const tmdbId = movie?.id != null ? String(movie.id) : ''
  const imdbId = String(movie?.imdb_id ?? '').trim()

  const cast = Array.isArray(credits?.cast)
    ? credits.cast
        .slice(0, 8)
        .map((person) => String(person?.name ?? '').trim())
        .filter(Boolean)
        .join('; ')
    : ''

  /** Candidate values keyed by spreadsheet column name. */
  const candidates = {
    Title: title,
    'Sort Title': title,
    'Original Title':
      originalTitle && originalTitle.toLowerCase() !== title.toLowerCase() ? originalTitle : '',
    Year: year,
    'Release Date': releaseDate,
    Director: directors,
    'Runtime (min)': runtimeText,
    Genre: genres,
    'Studio/Distributor': studios,
    Franchise: franchise,
    'Franchise/Collection': franchise,
    'Spoiler Free Summary': overview,
    'Spoiler-Free Plot Summary': overview,
    Country: countries,
    'Original Language': originalLanguage,
    Tagline: tagline,
    'TMDb ID': tmdbId,
    'IMDb ID': imdbId,
    Status: status,
    'Spoken Languages': spoken,
    Cast: cast,
  }

  const fields = {}
  for (const [key, value] of Object.entries(candidates)) {
    if (!allow(key)) continue
    if (MANUAL_PHYSICAL_FIELDS.includes(key)) continue
    if (!value) continue
    fields[key] = value
  }

  // Explicitly never map ratings even if a column exists under a similar name.
  delete fields['Rotten Tomatoes Critic Score']
  delete fields['Rotten Tomatoes – critics %']
  delete fields['Vote Average']
  delete fields['TMDb Rating']
  delete fields.Popularity

  return fields
}

/**
 * Merge TMDb-mapped fields into the current form values.
 * Overwrites only mappable metadata fields; preserves physical/manual cells.
 */
export function mergeMappedFields(current, mapped) {
  const next = { ...current }
  for (const [key, value] of Object.entries(mapped)) {
    if (MANUAL_PHYSICAL_FIELDS.includes(key)) continue
    if (!TMDB_MAPPABLE_FIELDS.includes(key)) continue
    next[key] = value
  }
  for (const key of MANUAL_PHYSICAL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      next[key] = current[key]
    }
  }
  return next
}

export function findTitleYearDuplicates(rows, title, year) {
  const wantTitle = String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const wantYear = year == null || year === '' ? null : String(Math.trunc(Number(year)))

  if (!wantTitle) return []

  return rows.filter((row) => {
    const rowTitle = String(row.Title ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
    if (rowTitle !== wantTitle) return false
    if (wantYear == null) return true
    const rowYear = String(row.Year ?? '')
      .trim()
      .replace(/\.0$/, '')
    if (!rowYear) return true
    return rowYear === wantYear
  })
}
