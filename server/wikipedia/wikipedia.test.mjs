import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isPreferredEnglishWikipediaUrl,
  isValidWikipediaUrl,
  scoreWikipediaResult,
  selectBestWikipediaMatch,
  wikiPageUrlFromTitle,
} from './client.mjs'

describe('Wikipedia URL helpers', () => {
  it('builds wiki URLs from page titles', () => {
    assert.equal(
      wikiPageUrlFromTitle('Argo (2012 film)'),
      'https://en.wikipedia.org/wiki/Argo_(2012_film)',
    )
  })

  it('validates preferred en.wikipedia URLs', () => {
    assert.equal(
      isPreferredEnglishWikipediaUrl('https://en.wikipedia.org/wiki/Argo_(2012_film)'),
      true,
    )
    assert.equal(isPreferredEnglishWikipediaUrl('https://example.com/x'), false)
    assert.equal(isValidWikipediaUrl('https://example.com/x'), true)
  })
})

describe('Wikipedia matching', () => {
  const argo2012 = {
    title: 'Argo (2012 film)',
    snippet: 'Argo is a 2012 American historical drama film directed by Ben Affleck.',
  }
  const argoTv = {
    title: 'Argo (TV series)',
    snippet: 'Argo is a television series.',
  }
  const dune1984 = {
    title: 'Dune (1984 film)',
    snippet: 'Dune is a 1984 American epic science fiction film.',
  }
  const dune2021 = {
    title: 'Dune (2021 film)',
    snippet: 'Dune is a 2021 American epic science fiction film.',
  }
  const amélie = {
    title: 'Amélie',
    snippet: 'Amélie is a 2001 French romantic comedy film.',
  }
  const disambig = {
    title: 'Alien (disambiguation)',
    snippet: 'Alien may refer to:',
  }

  it('matches an obvious film article', () => {
    const outcome = selectBestWikipediaMatch([argo2012, argoTv], 'Argo', 2012)
    assert.equal(outcome.status, 'matched')
    assert.equal(outcome.match.title, 'Argo (2012 film)')
    assert.match(outcome.match.url, /Argo_\(2012_film\)/)
  })

  it('keeps same-title different-year films ambiguous without year', () => {
    const outcome = selectBestWikipediaMatch([dune1984, dune2021], 'Dune', null)
    assert.equal(outcome.status, 'ambiguous')
    assert.ok(outcome.results.length >= 2)
  })

  it('narrows by year', () => {
    const outcome = selectBestWikipediaMatch([dune1984, dune2021], 'Dune', 2021)
    assert.equal(outcome.status, 'matched')
    assert.equal(outcome.match.title, 'Dune (2021 film)')
  })

  it('handles accented titles', () => {
    const score = scoreWikipediaResult(amélie, 'Amélie', 2001)
    assert.ok(score >= 100)
  })

  it('rejects disambiguation pages', () => {
    assert.ok(scoreWikipediaResult(disambig, 'Alien', 1979) < 0)
  })

  it('returns none when empty', () => {
    const outcome = selectBestWikipediaMatch([], 'Nope', 1999)
    assert.equal(outcome.status, 'none')
  })

  it('scores punctuation titles', () => {
    const result = {
      title: "Ocean's Eleven (2001 film)",
      snippet: "Ocean's Eleven is a 2001 heist film.",
    }
    const score = scoreWikipediaResult(result, "Ocean's Eleven", 2001)
    assert.ok(score >= 150)
  })
})
