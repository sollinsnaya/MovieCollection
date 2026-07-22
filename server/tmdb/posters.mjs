import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  renameSync,
  unlinkSync,
  writeSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { coverFilename } from '../covers.mjs'
import { posterImageUrl, TmdbError } from './client.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(__dirname, '../..')
export const COVERS_DIR = join(ROOT, 'public/covers')
export const DIST_COVERS_DIR = join(ROOT, 'dist/covers')

const DOWNLOAD_TIMEOUT_MS = 20_000

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

/**
 * Download a TMDb poster into public/covers (and dist/covers when present).
 * Reuses an existing preferred file unless `force` is true.
 */
export async function downloadPoster({
  title,
  year,
  posterPath,
  force = false,
  coversDir = COVERS_DIR,
  alsoWriteDirs = [],
} = {}) {
  if (!posterPath) {
    return {
      ok: false,
      code: 'no_poster',
      message: 'TMDb has no poster for this title.',
      filename: null,
      publicPath: null,
      reused: false,
      downloaded: false,
    }
  }

  const preferredName = coverFilename(title, year, 'jpg')
  if (!preferredName) {
    throw new TmdbError('Could not build a safe cover filename from the title.', {
      status: 400,
      code: 'invalid_filename',
    })
  }

  // Prefer exact Title (Year).jpg; also treat .jpeg/.png/.webp as existing.
  const stem = preferredName.replace(/\.jpg$/i, '')
  const existingExts = ['jpg', 'jpeg', 'png', 'webp']
  for (const ext of existingExts) {
    const existingName = `${stem}.${ext}`
    const existingPath = join(coversDir, existingName)
    if (existsSync(existingPath) && !force) {
      return {
        ok: true,
        code: 'reused',
        message: 'A local cover already exists; left it unchanged.',
        filename: existingName,
        publicPath: `/covers/${encodeURIComponent(stem)}.${ext}`,
        absolutePath: existingPath,
        reused: true,
        downloaded: false,
      }
    }
  }

  const url = posterImageUrl(posterPath, 'original') || posterImageUrl(posterPath, 'w780')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)

  let response
  try {
    response = await fetch(url, { signal: controller.signal })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new TmdbError('Poster download timed out.', {
        status: 504,
        code: 'poster_timeout',
        cause: error,
      })
    }
    throw new TmdbError('Could not download the poster image.', {
      status: 502,
      code: 'poster_network',
      cause: error,
    })
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    throw new TmdbError(`Poster download failed (${response.status}).`, {
      status: 502,
      code: 'poster_download_failed',
    })
  }

  const contentType = response.headers.get('content-type') ?? ''
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length < 100) {
    throw new TmdbError('Poster download returned an empty or invalid file.', {
      status: 502,
      code: 'invalid_image',
    })
  }

  const sniffed = sniffImageExtension(buffer, contentType)
  if (!sniffed) {
    throw new TmdbError('Poster response was not a recognized image.', {
      status: 502,
      code: 'invalid_image',
    })
  }

  const filename = coverFilename(title, year, sniffed === 'jpeg' ? 'jpg' : sniffed)
  const absolutePath = join(coversDir, filename)

  try {
    writeAtomic(absolutePath, buffer)
    for (const dir of alsoWriteDirs) {
      if (!dir || dir === coversDir) continue
      if (!existsSync(dirname(dir)) && !existsSync(dir)) {
        // Only mirror into dist/covers when dist already exists.
        if (!existsSync(dirname(dir))) continue
      }
      try {
        if (existsSync(dirname(dir)) || existsSync(join(dirname(dir), '..'))) {
          mkdirSync(dir, { recursive: true })
          writeAtomic(join(dir, filename), buffer)
        }
      } catch {
        // Non-fatal: public/covers is the source of truth.
      }
    }
  } catch (error) {
    const code = error?.code
    if (code === 'EACCES' || code === 'EPERM') {
      throw new TmdbError(
        'Could not write the cover file. Check permissions on public/covers/.',
        { status: 500, code: 'fs_permission', cause: error },
      )
    }
    throw new TmdbError('Could not save the cover file.', {
      status: 500,
      code: 'fs_error',
      cause: error,
    })
  }

  const publicStem = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '')
  const publicExt = filename.split('.').pop()
  return {
    ok: true,
    code: 'downloaded',
    message: 'Poster saved to public/covers/.',
    filename,
    publicPath: `/covers/${encodeURIComponent(publicStem)}.${publicExt}`,
    absolutePath,
    reused: false,
    downloaded: true,
  }
}

/** Test helper: expose sniff without downloading. */
export function detectImageExtension(buffer, contentType) {
  return sniffImageExtension(buffer, contentType)
}

/** Test helper for atomic write. */
export function writeFileAtomic(targetPath, buffer) {
  writeAtomic(targetPath, Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer))
}
