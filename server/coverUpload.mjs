import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { coverFileStem, coverFilename } from './covers.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(__dirname, '..')
export const COVERS_DIR = join(ROOT, 'public/covers')
export const DIST_COVERS_DIR = join(ROOT, 'dist/covers')

const COVER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export class CoverUploadError extends Error {
  constructor(message, { status = 400, code = 'cover_error', cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'CoverUploadError'
    this.status = status
    this.code = code
  }
}

function parseYear(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const year = Math.trunc(n)
  if (year < 1800 || year > 2100) return null
  return year
}

function sniffImageExtension(buffer, contentType) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png'
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }

  const type = String(contentType ?? '').toLowerCase()
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  return null
}

function writeAtomic(targetPath, buffer) {
  mkdirSync(dirname(targetPath), { recursive: true })
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`
  const fd = openSync(tempPath, 'w')
  try {
    writeSync(fd, buffer)
    closeSync(fd)
    renameSync(tempPath, targetPath)
  } catch (error) {
    try {
      closeSync(fd)
    } catch {
      // ignore
    }
    try {
      unlinkSync(tempPath)
    } catch {
      // ignore
    }
    throw error
  }
}

function stemCandidates(title, year, catalogId) {
  const stems = []
  const preferred = coverFileStem(title, year)
  if (preferred) stems.push(preferred)
  const id = String(catalogId ?? '').trim()
  if (id) stems.push(id)
  return [...new Set(stems)]
}

/** Find on-disk cover files for a movie (title/year preferred + catalog ID fallback). */
export function findCoverFiles(title, year, catalogId, coversDir = COVERS_DIR) {
  if (!existsSync(coversDir)) return []

  const found = []
  const seen = new Set()
  const stems = stemCandidates(title, parseYear(year), catalogId)

  for (const stem of stems) {
    for (const ext of COVER_EXTENSIONS) {
      const filename = `${stem}.${ext}`
      const absolutePath = join(coversDir, filename)
      if (!existsSync(absolutePath) || seen.has(filename)) continue
      seen.add(filename)
      found.push({
        filename,
        absolutePath,
        publicPath: `/covers/${encodeURIComponent(stem)}.${ext}`,
        kind: stem === coverFileStem(title, parseYear(year)) ? 'title' : 'catalog',
      })
    }
  }

  // Also catch loose matches if directory listing reveals same stem with odd casing (Linux exact).
  try {
    const names = readdirSync(coversDir)
    for (const stem of stems) {
      const lowerStem = stem.toLowerCase()
      for (const name of names) {
        const match = name.match(/^(.*)\.(jpg|jpeg|png|webp)$/i)
        if (!match) continue
        if (match[1].toLowerCase() !== lowerStem) continue
        if (seen.has(name)) continue
        seen.add(name)
        found.push({
          filename: name,
          absolutePath: join(coversDir, name),
          publicPath: `/covers/${encodeURIComponent(match[1])}.${match[2].toLowerCase()}`,
          kind: 'other',
        })
      }
    }
  } catch {
    // ignore listing errors
  }

  return found
}

export function deleteCoverFiles(files) {
  const deleted = []
  for (const file of files) {
    try {
      if (existsSync(file.absolutePath)) {
        unlinkSync(file.absolutePath)
        deleted.push(file.filename)
      }
    } catch (error) {
      throw new CoverUploadError(`Could not delete existing cover “${file.filename}”.`, {
        status: 500,
        code: 'delete_failed',
        cause: error,
      })
    }
  }
  return deleted
}

function mirrorToDist(filename, buffer) {
  if (!existsSync(join(ROOT, 'dist'))) return
  try {
    mkdirSync(DIST_COVERS_DIR, { recursive: true })
    writeAtomic(join(DIST_COVERS_DIR, filename), buffer)
  } catch {
    // public/covers is the source of truth
  }
}

function removeDistMirrors(filenames) {
  if (!existsSync(DIST_COVERS_DIR)) return
  for (const filename of filenames) {
    const path = join(DIST_COVERS_DIR, filename)
    try {
      if (existsSync(path)) unlinkSync(path)
    } catch {
      // ignore
    }
  }
}

/**
 * Save an uploaded cover image, replacing any existing local covers for the movie.
 */
export function saveUploadedCover({
  title,
  year,
  catalogId,
  buffer,
  contentType,
  coversDir = COVERS_DIR,
} = {}) {
  const cleanedTitle = String(title ?? '').trim()
  if (!cleanedTitle) {
    throw new CoverUploadError('Title is required to name the cover file.', {
      status: 400,
      code: 'invalid_title',
    })
  }

  if (!Buffer.isBuffer(buffer) || buffer.length < 100) {
    throw new CoverUploadError('Upload was empty or too small to be an image.', {
      status: 400,
      code: 'invalid_image',
    })
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new CoverUploadError('Cover file is too large (max 8 MB).', {
      status: 413,
      code: 'too_large',
    })
  }

  const ext = sniffImageExtension(buffer, contentType)
  if (!ext) {
    throw new CoverUploadError('File must be a JPEG, PNG, or WebP image.', {
      status: 400,
      code: 'invalid_image',
    })
  }

  const parsedYear = parseYear(year)
  const filename = coverFilename(cleanedTitle, parsedYear, ext)
  if (!filename) {
    throw new CoverUploadError('Could not build a safe cover filename.', {
      status: 400,
      code: 'invalid_filename',
    })
  }

  const existing = findCoverFiles(cleanedTitle, parsedYear, catalogId, coversDir)
  const deleted = deleteCoverFiles(existing)
  removeDistMirrors(deleted)

  const absolutePath = join(coversDir, filename)
  try {
    writeAtomic(absolutePath, buffer)
    mirrorToDist(filename, buffer)
  } catch (error) {
    const code = error?.code
    if (code === 'EACCES' || code === 'EPERM') {
      throw new CoverUploadError(
        'Could not write the cover file. Check permissions on public/covers/.',
        { status: 500, code: 'fs_permission', cause: error },
      )
    }
    throw new CoverUploadError('Could not save the cover file.', {
      status: 500,
      code: 'fs_error',
      cause: error,
    })
  }

  const stem = coverFileStem(cleanedTitle, parsedYear)
  return {
    ok: true,
    filename,
    publicPath: `/covers/${encodeURIComponent(stem)}.${ext}`,
    deleted,
    replaced: deleted.length > 0,
  }
}

export function decodeDataUrlOrBase64(data, contentTypeHint = '') {
  const text = String(data ?? '').trim()
  if (!text) {
    throw new CoverUploadError('No image data provided.', { status: 400, code: 'missing_data' })
  }

  const dataUrl = text.match(/^data:([^;,]+);base64,(.+)$/i)
  if (dataUrl) {
    return {
      buffer: Buffer.from(dataUrl[2], 'base64'),
      contentType: dataUrl[1],
    }
  }

  return {
    buffer: Buffer.from(text, 'base64'),
    contentType: contentTypeHint,
  }
}

export { sniffImageExtension as detectImageExtension, parseYear as parseCoverYear }
