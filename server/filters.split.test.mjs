import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

/** Mirrors `splitGenres` / genre AND matching in `src/lib/filters.ts`. */
function splitGenres(genre) {
  if (!String(genre ?? '').trim()) return []
  return String(genre)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
}

function matchesGenres(movieGenre, selected) {
  if (selected.length === 0) return true
  const tokens = splitGenres(movieGenre)
  return selected.every((genre) => tokens.includes(genre))
}

describe('splitGenres', () => {
  it('splits semicolon-separated genres and trims whitespace', () => {
    assert.deepEqual(splitGenres('Satire; psychological horror; black comedy'), [
      'Satire',
      'psychological horror',
      'black comedy',
    ])
  })

  it('handles a single genre and empty cells', () => {
    assert.deepEqual(splitGenres('Comedy'), ['Comedy'])
    assert.deepEqual(splitGenres(''), [])
    assert.deepEqual(splitGenres('  ;  ; '), [])
  })
})

describe('genre filter AND matching', () => {
  const americanPsycho = 'Satire; psychological horror; black comedy'

  it('matches when every selected genre is present', () => {
    assert.equal(matchesGenres(americanPsycho, ['Satire']), true)
    assert.equal(matchesGenres(americanPsycho, ['Satire', 'black comedy']), true)
  })

  it('rejects when any selected genre is missing', () => {
    assert.equal(matchesGenres(americanPsycho, ['Satire', 'Action']), false)
  })
})
