/** Turn spreadsheet cell values into clean display/filter values. */

export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** Spreadsheet years often arrive as "2019.0". */
export function parseYear(value: unknown): number | null {
  const text = cleanText(value)
  if (!text) return null
  const n = Number(text)
  if (!Number.isFinite(n)) return null
  const year = Math.trunc(n)
  if (year < 1800 || year > 2100) return null
  return year
}

export function parseRuntime(value: unknown): number | null {
  const text = cleanText(value)
  if (!text) return null
  const n = Number(text)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

export function parseDate(value: unknown): string | null {
  const text = cleanText(value)
  if (!text) return null
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return text
}

export function displayValue(value: unknown, fallback = '—'): string {
  const text = cleanText(value)
  return text || fallback
}
