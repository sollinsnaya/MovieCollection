import { splitFormats } from '../lib/filters'
import './DiscFormatBadges.css'

export type DiscFormatKind = 'uhd' | 'bluray' | 'dvd'

const LOGO_SRC: Record<DiscFormatKind, string> = {
  uhd: '/format-logos/uhd-4k.png',
  bluray: '/format-logos/blu-ray.jpg',
  dvd: '/format-logos/dvd.png',
}

const LOGO_ALT: Record<DiscFormatKind, string> = {
  uhd: '4K Ultra HD',
  bluray: 'Blu-ray Disc',
  dvd: 'DVD Video',
}

/** Map a spreadsheet format token to a badge kind. */
export function classifyDiscFormat(token: string): DiscFormatKind | null {
  const text = token.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!text) return null

  if (
    text.includes('uhd') ||
    text.includes('ultra hd') ||
    text.includes('ultra-hd') ||
    /\b4k\b/.test(text)
  ) {
    return 'uhd'
  }

  if (text.includes('blu-ray') || text.includes('bluray') || text.includes('blu ray')) {
    return 'bluray'
  }

  if (text === 'dvd' || text.includes('dvd')) {
    return 'dvd'
  }

  return null
}

/**
 * Which logos to show for a Disc Format cell.
 * UHD/4K supersedes Blu-ray — combo strings like "UHD 4K/Blu-ray" show only 4K.
 */
export function discFormatKinds(discFormat: string): DiscFormatKind[] {
  const seen = new Set<DiscFormatKind>()

  for (const token of splitFormats(discFormat)) {
    const kind = classifyDiscFormat(token)
    if (kind) seen.add(kind)
  }

  if (seen.has('uhd')) {
    seen.delete('bluray')
  }

  const order: DiscFormatKind[] = ['uhd', 'bluray', 'dvd']
  return order.filter((kind) => seen.has(kind))
}

type DiscFormatBadgesProps = {
  discFormat: string
}

export function DiscFormatBadges({ discFormat }: DiscFormatBadgesProps) {
  const kinds = discFormatKinds(discFormat)
  if (kinds.length === 0) return null

  return (
    <div className="disc-badges" aria-label={`Disc format: ${discFormat}`}>
      {kinds.map((kind) => (
        <div key={kind} className={`disc-badge disc-badge--${kind}`}>
          <img
            className="disc-badge__image"
            src={LOGO_SRC[kind]}
            alt={LOGO_ALT[kind]}
            loading="lazy"
          />
        </div>
      ))}
    </div>
  )
}
