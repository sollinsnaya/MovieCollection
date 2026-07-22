/**
 * Cover filename helpers — keep in sync with `src/lib/covers.ts`.
 */

export function sanitizeCoverTitle(title) {
  return String(title ?? '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
}

export function coverFileStem(title, year) {
  const safeTitle = sanitizeCoverTitle(title)
  if (!safeTitle) return ''
  if (year != null && Number.isFinite(year)) return `${safeTitle} (${year})`
  return safeTitle
}

export function coverFilename(title, year, extension = 'jpg') {
  const stem = coverFileStem(title, year)
  if (!stem) return ''
  return `${stem}.${extension}`
}
