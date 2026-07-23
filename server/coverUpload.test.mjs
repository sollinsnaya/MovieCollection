import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import {
  decodeDataUrlOrBase64,
  findCoverFiles,
  saveUploadedCover,
} from './coverUpload.mjs'

function tinyJpeg() {
  // Minimal JPEG header bytes + padding so length >= 100
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
  return Buffer.concat([header, Buffer.alloc(120, 1)])
}

describe('manual cover upload', () => {
  it('saves a new cover when none exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'shelf-cover-upload-'))
    const result = saveUploadedCover({
      title: 'Alien',
      year: 1979,
      catalogId: 'MC-0005',
      buffer: tinyJpeg(),
      contentType: 'image/jpeg',
      coversDir: dir,
    })
    assert.equal(result.replaced, false)
    assert.equal(result.filename, 'Alien (1979).jpg')
    assert.ok(existsSync(join(dir, 'Alien (1979).jpg')))
    rmSync(dir, { recursive: true, force: true })
  })

  it('deletes old title and catalog covers when replacing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'shelf-cover-replace-'))
    writeFileSync(join(dir, 'Alien (1979).png'), Buffer.alloc(20))
    writeFileSync(join(dir, 'MC-0005.jpg'), Buffer.alloc(20))

    const before = findCoverFiles('Alien', 1979, 'MC-0005', dir)
    assert.equal(before.length, 2)

    const result = saveUploadedCover({
      title: 'Alien',
      year: 1979,
      catalogId: 'MC-0005',
      buffer: tinyJpeg(),
      contentType: 'image/jpeg',
      coversDir: dir,
    })

    assert.equal(result.replaced, true)
    assert.ok(result.deleted.includes('Alien (1979).png'))
    assert.ok(result.deleted.includes('MC-0005.jpg'))
    assert.ok(existsSync(join(dir, 'Alien (1979).jpg')))
    assert.equal(existsSync(join(dir, 'Alien (1979).png')), false)
    assert.equal(existsSync(join(dir, 'MC-0005.jpg')), false)
    rmSync(dir, { recursive: true, force: true })
  })

  it('rejects non-image payloads', () => {
    const dir = mkdtempSync(join(tmpdir(), 'shelf-cover-bad-'))
    assert.throws(
      () =>
        saveUploadedCover({
          title: 'Alien',
          year: 1979,
          catalogId: 'MC-0005',
          buffer: Buffer.from('not-an-image-but-long-enough-to-pass-size-check........'),
          contentType: 'text/plain',
          coversDir: dir,
        }),
      /JPEG|PNG|WebP|image/i,
    )
    rmSync(dir, { recursive: true, force: true })
  })

  it('decodes data URLs', () => {
    const jpeg = tinyJpeg()
    const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`
    const decoded = decodeDataUrlOrBase64(dataUrl)
    assert.equal(decoded.contentType, 'image/jpeg')
    assert.equal(readFileSync.length > 0, true)
    assert.ok(decoded.buffer.equals(jpeg))
  })
})
