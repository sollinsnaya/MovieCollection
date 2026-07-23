#!/usr/bin/env node
/**
 * Optionally backfill blank Wikipedia Link cells in Master Film List.xlsx.
 *
 * Usage:
 *   npm run find-wikipedia-pages
 *   npm run find-wikipedia-pages -- --dry-run
 *   npm run find-wikipedia-pages -- --limit 10
 *
 * Only high-confidence automatic matches are written.
 * Ambiguous / missing titles are listed in a review report.
 * Existing Wikipedia Link values are never overwritten.
 */

import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCollection, writeCollection } from '../server/collectionStore.mjs'
import { searchWikipediaMovie } from '../server/wikipedia/client.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const WIKI_FIELD = 'Wikipedia Link'
const REPORT_DIR = join(ROOT, 'public/covers')

function parseArgs(argv) {
  const opts = { dryRun: false, limit: null }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--limit') {
      opts.limit = Number(argv[i + 1])
      i += 1
    }
  }
  return opts
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  let { columns, rows, sheetName } = readCollection()

  if (!columns.includes(WIKI_FIELD)) {
    columns = [...columns, WIKI_FIELD]
    rows = rows.map((row) => ({ ...row, [WIKI_FIELD]: row[WIKI_FIELD] ?? '' }))
  }

  let candidates = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !String(row[WIKI_FIELD] ?? '').trim())
    .filter(({ row }) => String(row.Title ?? '').trim())

  if (opts.limit != null && Number.isFinite(opts.limit)) {
    candidates = candidates.slice(0, opts.limit)
  }

  const report = {
    startedAt: new Date().toISOString(),
    dryRun: opts.dryRun,
    matched: [],
    ambiguous: [],
    missing: [],
    errors: [],
    skippedExisting: rows.length - candidates.length,
  }

  console.log(
    `Processing ${candidates.length} title(s) with blank Wikipedia Link${opts.dryRun ? ' (dry-run)' : ''}…`,
  )

  for (const { row, index } of candidates) {
    const title = String(row.Title ?? '').trim()
    const year = row.Year
    const label = `${title}${year ? ` (${year})` : ''}`

    try {
      const outcome = await searchWikipediaMovie(title, year)
      await sleep(350)

      if (outcome.status === 'matched' && outcome.match?.url) {
        report.matched.push({
          catalogId: row['Catalog ID'],
          title,
          year,
          url: outcome.match.url,
          wikiTitle: outcome.match.title,
        })
        if (!opts.dryRun) {
          rows[index] = { ...rows[index], [WIKI_FIELD]: outcome.match.url }
        }
        console.log(`ok    ${label} → ${outcome.match.url}`)
        continue
      }

      if (outcome.status === 'ambiguous') {
        report.ambiguous.push({
          catalogId: row['Catalog ID'],
          title,
          year,
          candidates: outcome.results.map((item) => ({
            title: item.title,
            url: item.url,
            score: item.score,
          })),
        })
        console.log(`ambig ${label}`)
        continue
      }

      report.missing.push({ catalogId: row['Catalog ID'], title, year })
      console.log(`miss  ${label}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      report.errors.push({ catalogId: row['Catalog ID'], title, year, error: message })
      console.error(`err   ${label}: ${message}`)
      await sleep(500)
    }
  }

  if (!opts.dryRun && report.matched.length > 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(ROOT, `Master Film List.backup-${stamp}.xlsx`)
    copyFileSync(join(ROOT, 'Master Film List.xlsx'), backupPath)
    writeCollection(columns, rows, sheetName)
    console.log(`Backup: ${backupPath}`)
    console.log('Spreadsheet updated.')
  }

  report.finishedAt = new Date().toISOString()
  mkdirSync(REPORT_DIR, { recursive: true })
  const reportPath = join(REPORT_DIR, `wikipedia-backfill-report.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log('\nDone.')
  console.log(`  matched:   ${report.matched.length}`)
  console.log(`  ambiguous: ${report.ambiguous.length}`)
  console.log(`  missing:   ${report.missing.length}`)
  console.log(`  errors:    ${report.errors.length}`)
  console.log(`Report: ${reportPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
