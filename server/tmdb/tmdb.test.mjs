import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { coverFilename, sanitizeCoverTitle } from '../covers.mjs'
import {
  resolveSearchResults,
  scoreSearchMatch,
  toSearchResult,
  resolveTmdbAuth,
} from './client.mjs'
import {
  extractDirectors,
  findTitleYearDuplicates,
  mapTmdbToFields,
  mergeMappedFields,
  MANUAL_PHYSICAL_FIELDS,
} from './mapFields.mjs'
import { detectImageExtension, writeFileAtomic } from './posters.mjs'

const COLUMNS = [
  'Catalog ID',
  'Title',
  'Rotten Tomatoes Critic Score',
  'Spoiler Free Summary',
  'Year',
  'Director',
  'Runtime (min)',
  'Genre',
  'Studio/Distributor',
  'Edition',
  'Steelbook',
  'Disc Format',
  'HDR10',
  'Franchise',
  'Boutique Label',
  'Wikipedia Link',
]

function sampleMovie(overrides = {}) {
  return {
    id: 11,
    title: 'Star Wars',
    original_title: 'Star Wars',
    overview: 'A long time ago…',
    release_date: '1977-05-25',
    runtime: 121,
    tagline: 'A long time ago in a galaxy far, far away…',
    status: 'Released',
    original_language: 'en',
    imdb_id: 'tt0076759',
    vote_average: 8.2,
    vote_count: 20000,
    popularity: 99,
    poster_path: '/poster.jpg',
    genres: [{ name: 'Adventure' }, { name: 'Science Fiction' }],
    production_companies: [{ name: 'Lucasfilm' }, { name: '20th Century Fox' }],
    production_countries: [{ name: 'United States of America' }],
    spoken_languages: [{ english_name: 'English' }],
    belongs_to_collection: { name: 'Star Wars Collection' },
    ...overrides,
  }
}

function sampleCredits(directors = ['George Lucas']) {
  return {
    crew: directors.map((name) => ({ job: 'Director', name })),
    cast: [
      { name: 'Mark Hamill' },
      { name: 'Harrison Ford' },
      { name: 'Carrie Fisher' },
    ],
  }
}

describe('TMDb auth', () => {
  it('reports missing API key', () => {
    assert.equal(resolveTmdbAuth({}), null)
  })

  it('accepts v3 API key', () => {
    const auth = resolveTmdbAuth({ TMDB_API_KEY: 'abc123' })
    assert.equal(auth.mode, 'api_key')
  })

  it('accepts bearer read access token', () => {
    const auth = resolveTmdbAuth({ TMDB_READ_ACCESS_TOKEN: 'eyJhbGciOi.test' })
    assert.equal(auth.mode, 'bearer')
  })
})

describe('search resolution', () => {
  const alien1979 = {
    id: 348,
    title: 'Alien',
    original_title: 'Alien',
    release_date: '1979-05-25',
    overview: 'In space…',
    poster_path: '/a.jpg',
  }
  const alienCovenant = {
    id: 126889,
    title: 'Alien: Covenant',
    original_title: 'Alien: Covenant',
    release_date: '2017-05-09',
    overview: 'Bound…',
    poster_path: '/b.jpg',
  }
  const aliens = {
    id: 679,
    title: 'Aliens',
    original_title: 'Aliens',
    release_date: '1986-07-18',
    overview: 'This time…',
    poster_path: '/c.jpg',
  }

  it('matches a single exact result', () => {
    const outcome = resolveSearchResults([alien1979], 'Alien', 1979)
    assert.equal(outcome.status, 'matched')
    assert.equal(outcome.match.tmdbId, 348)
  })

  it('returns ambiguous for multiple exact same titles without a year', () => {
    const dune1984 = {
      id: 841,
      title: 'Dune',
      original_title: 'Dune',
      release_date: '1984-12-14',
      overview: 'A world…',
      poster_path: '/d1.jpg',
    }
    const dune2021 = {
      id: 438631,
      title: 'Dune',
      original_title: 'Dune',
      release_date: '2021-09-15',
      overview: 'Paul…',
      poster_path: '/d2.jpg',
    }
    const outcome = resolveSearchResults([dune1984, dune2021], 'Dune', null)
    assert.equal(outcome.status, 'ambiguous')
    assert.equal(outcome.results.length, 2)
    assert.match(outcome.message, /year|TMDb ID/i)
  })

  it('narrows by year to a single strong match', () => {
    const outcome = resolveSearchResults([alien1979, alienCovenant], 'Alien', 1979)
    assert.equal(outcome.status, 'matched')
    assert.equal(outcome.match.tmdbId, 348)
  })

  it('matches a unique exact title even when similar franchise titles exist', () => {
    const outcome = resolveSearchResults([alien1979, aliens, alienCovenant], 'Alien', null)
    assert.equal(outcome.status, 'matched')
    assert.equal(outcome.match.tmdbId, 348)
  })

  it('returns none when empty', () => {
    const outcome = resolveSearchResults([], 'Nope', 1999)
    assert.equal(outcome.status, 'none')
  })

  it('scores exact title+year highest', () => {
    const score = scoreSearchMatch(alien1979, 'Alien', 1979)
    assert.ok(score >= 180)
  })
})

describe('TMDb field mapping', () => {
  it('maps directors, genres, studios, franchise, and summary', () => {
    const fields = mapTmdbToFields(sampleMovie(), sampleCredits(['George Lucas', 'Irvin Kershner']), COLUMNS)
    assert.equal(fields.Title, 'Star Wars')
    assert.equal(fields.Year, '1977')
    assert.equal(fields.Director, 'George Lucas; Irvin Kershner')
    assert.equal(fields['Runtime (min)'], '121')
    assert.equal(fields.Genre, 'Adventure; Science Fiction')
    assert.equal(fields['Studio/Distributor'], 'Lucasfilm; 20th Century Fox')
    assert.equal(fields.Franchise, 'Star Wars Collection')
    assert.equal(fields['Spoiler Free Summary'], 'A long time ago…')
  })

  it('does not import ratings', () => {
    const fields = mapTmdbToFields(sampleMovie(), sampleCredits(), COLUMNS)
    assert.equal(fields['Rotten Tomatoes Critic Score'], undefined)
    assert.equal(fields['Vote Average'], undefined)
    assert.equal(fields.Popularity, undefined)
  })

  it('does not guess physical edition fields', () => {
    const fields = mapTmdbToFields(sampleMovie(), sampleCredits(), COLUMNS)
    for (const key of [
      'Disc Format',
      'Edition',
      'Steelbook',
      'HDR10',
      'Boutique Label',
      'Catalog ID',
    ]) {
      assert.equal(fields[key], undefined)
    }
  })

  it('only includes columns present in the sheet', () => {
    const fields = mapTmdbToFields(sampleMovie(), sampleCredits(), ['Title', 'Year'])
    assert.deepEqual(Object.keys(fields).sort(), ['Title', 'Year'])
  })

  it('preserves existing Rotten Tomatoes and physical fields on merge', () => {
    const current = {
      Title: 'Old',
      'Rotten Tomatoes Critic Score': '95%',
      'Disc Format': 'UHD 4K/Blu-ray',
      Edition: 'Steelbook',
    }
    const mapped = mapTmdbToFields(sampleMovie(), sampleCredits(), COLUMNS)
    const merged = mergeMappedFields(current, mapped)
    assert.equal(merged['Rotten Tomatoes Critic Score'], '95%')
    assert.equal(merged['Disc Format'], 'UHD 4K/Blu-ray')
    assert.equal(merged.Edition, 'Steelbook')
    assert.equal(merged.Title, 'Star Wars')
    assert.ok(MANUAL_PHYSICAL_FIELDS.includes('Rotten Tomatoes Critic Score'))
  })

  it('extracts multiple directors', () => {
    assert.equal(
      extractDirectors(sampleCredits(['Lana Wachowski', 'Lilly Wachowski'])),
      'Lana Wachowski; Lilly Wachowski',
    )
  })
})

describe('duplicate detection', () => {
  const rows = [
    { 'Catalog ID': 'MC-0001', Title: 'Alien', Year: '1979', 'Disc Format': 'UHD 4K/Blu-ray' },
    { 'Catalog ID': 'MC-0002', Title: 'Aliens', Year: '1986' },
  ]

  it('finds title+year duplicates', () => {
    const hits = findTitleYearDuplicates(rows, 'Alien', 1979)
    assert.equal(hits.length, 1)
    assert.equal(hits[0]['Catalog ID'], 'MC-0001')
  })

  it('ignores different years', () => {
    assert.equal(findTitleYearDuplicates(rows, 'Alien', 2017).length, 0)
  })
})

describe('cover filenames', () => {
  it('sanitizes unsafe characters', () => {
    assert.equal(sanitizeCoverTitle('Alien: Romulus / Cut'), 'Alien Romulus Cut')
    assert.equal(sanitizeCoverTitle('  Foo?.bar  '), 'Foo.bar')
  })

  it('builds Title (Year).jpg including apostrophes and unicode', () => {
    assert.equal(coverFilename("Ocean's Eleven", 2001), "Ocean's Eleven (2001).jpg")
    assert.equal(coverFilename('Amélie', 2001), 'Amélie (2001).jpg')
  })

  it('handles missing year', () => {
    assert.equal(coverFilename('Trilogy Box', null), 'Trilogy Box.jpg')
  })
})

describe('poster helpers', () => {
  it('detects jpeg magic bytes', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    assert.equal(detectImageExtension(jpeg, 'application/octet-stream'), 'jpg')
  })

  it('rejects non-images', () => {
    assert.equal(detectImageExtension(Buffer.from('not-an-image'), 'text/plain'), null)
  })

  it('writes files atomically', () => {
    const dir = mkdtempSync(join(tmpdir(), 'shelf-covers-'))
    const target = join(dir, 'Alien (1979).jpg')
    writeFileAtomic(target, Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02]))
    assert.ok(existsSync(target))
    assert.ok(readFileSync(target).length >= 3)
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('search result shaping', () => {
  it('handles missing poster and release date', () => {
    const result = toSearchResult({
      id: 1,
      title: 'Mystery',
      original_title: 'Mystery',
      overview: '',
      poster_path: null,
      release_date: '',
    })
    assert.equal(result.year, null)
    assert.equal(result.posterThumbUrl, null)
    assert.equal(result.tmdbId, 1)
  })
})
