/**
 * Cover image convention — local files only (nothing is fetched by the UI).
 *
 * Preferred (from fetch-covers script / manual drops):
 *   public/covers/{Title} ({Year}).jpg
 *   e.g. Alien (1979).jpg
 *
 * Fallback:
 *   public/covers/{Catalog ID}.jpg
 *   e.g. MC-0001.jpg
 */

const COVER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const

/** Strip characters that are unsafe in filenames across platforms. */
export function sanitizeCoverTitle(title: string): string {
  return title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
}

export function coverFileStem(title: string, year: number | null | undefined): string {
  const safeTitle = sanitizeCoverTitle(title)
  if (!safeTitle) return ''
  if (year != null && Number.isFinite(year)) {
    return `${safeTitle} (${year})`
  }
  return safeTitle
}

function pathsForStem(stem: string): string[] {
  if (!stem) return []
  const encoded = encodeURIComponent(stem)
  return COVER_EXTENSIONS.map((ext) => `/covers/${encoded}.${ext}`)
}

export function coverCandidates(
  title: string,
  year: number | null | undefined,
  catalogId: string,
): string[] {
  const byTitleYear = pathsForStem(coverFileStem(title, year))
  const byId = pathsForStem(catalogId.trim())
  // Prefer Title (Year); keep Catalog ID as a manual-drop fallback.
  return [...byTitleYear, ...byId]
}
