import { isBooleanTruthy } from '../lib/booleanFields'
import { splitFormats } from '../lib/filters'
import './DiscFormatBadges.css'

export type DiscFormatKind = 'uhd' | 'bluray' | 'dvd'
export type AudioBadgeKind =
  | 'dolby-digital'
  | 'dolby-surround'
  | 'dolby-atmos'
  | 'dolby-truehd'
  | 'stereo'
  | 'dts-x'
  | 'dts-hd'
  | 'audio-7-1'
  | 'audio-5-1'
export type HdrBadgeKind = 'dolby-vision' | 'hdr10' | 'hdr10plus'
export type FormatBadgeKind = DiscFormatKind | AudioBadgeKind | HdrBadgeKind

const LOGO_SRC: Record<FormatBadgeKind, string> = {
  uhd: '/format-logos/uhd-4k.jpg',
  bluray: '/format-logos/blu-ray.jpg',
  dvd: '/format-logos/dvd.jpg',
  'dolby-digital': '/format-logos/dolby-digital.jpg',
  'dolby-surround': '/format-logos/dolby-surround.jpg',
  'dolby-atmos': '/format-logos/dolby-atmos.jpg',
  'dolby-truehd': '/format-logos/dolby-truehd.jpg',
  stereo: '/format-logos/stereo.jpg',
  'dts-x': '/format-logos/dts-x.jpg',
  'dts-hd': '/format-logos/dts-hd.jpg',
  'audio-7-1': '/format-logos/audio-7-1.jpg',
  'audio-5-1': '/format-logos/audio-5-1.jpg',
  'dolby-vision': '/format-logos/dolby-vision.jpg',
  hdr10: '/format-logos/hdr10.jpg',
  hdr10plus: '/format-logos/hdr10-plus.jpg',
}

const LOGO_ALT: Record<FormatBadgeKind, string> = {
  uhd: '4K Ultra HD',
  bluray: 'Blu-ray Disc',
  dvd: 'DVD Video',
  'dolby-digital': 'Dolby Digital',
  'dolby-surround': 'Dolby Surround',
  'dolby-atmos': 'Dolby Atmos',
  'dolby-truehd': 'Dolby TrueHD',
  stereo: 'Stereo',
  'dts-x': 'DTS:X',
  'dts-hd': 'DTS-HD Master Audio',
  'audio-7-1': '7.1',
  'audio-5-1': '5.1',
  'dolby-vision': 'Dolby Vision',
  hdr10: 'HDR10',
  hdr10plus: 'HDR10+',
}

function BadgeImage({ kind }: { kind: FormatBadgeKind }) {
  return (
    <div className={`disc-badge disc-badge--${kind}`}>
      <img
        className="disc-badge__image"
        src={LOGO_SRC[kind]}
        alt={LOGO_ALT[kind]}
        loading="lazy"
      />
    </div>
  )
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

/**
 * Mid-row audio logos from spreadsheet checkboxes.
 * Dolby Atmos / TrueHD can all appear together (non-exclusive).
 * Exclusive pairs share one slot: DTS:X vs DTS-HD, and 7.1 vs 5.1
 * (prefer the higher-end option if both are somehow checked).
 */
export function audioBadgeKinds(fields: {
  dolbyDigital?: unknown
  dolbySurround?: unknown
  dolbyAtmos?: unknown
  dolbyTrueHd?: unknown
  stereo?: unknown
  dtsX?: unknown
  dtsHd?: unknown
  surround71?: unknown
  surround51?: unknown
}): AudioBadgeKind[] {
  const kinds: AudioBadgeKind[] = []
  if (isBooleanTruthy(fields.dolbyDigital)) kinds.push('dolby-digital')
  if (isBooleanTruthy(fields.dolbySurround)) kinds.push('dolby-surround')
  if (isBooleanTruthy(fields.dolbyAtmos)) kinds.push('dolby-atmos')
  if (isBooleanTruthy(fields.dolbyTrueHd)) kinds.push('dolby-truehd')
  if (isBooleanTruthy(fields.stereo)) kinds.push('stereo')

  if (isBooleanTruthy(fields.dtsX)) kinds.push('dts-x')
  else if (isBooleanTruthy(fields.dtsHd)) kinds.push('dts-hd')

  if (isBooleanTruthy(fields.surround71)) kinds.push('audio-7-1')
  else if (isBooleanTruthy(fields.surround51)) kinds.push('audio-5-1')

  return kinds
}

/**
 * HDR / picture logos — Dolby Vision, HDR10, and HDR10+ can all appear together.
 */
export function hdrBadgeKinds(
  dolbyVision: unknown,
  hdr10: unknown,
  hdr10Plus: unknown,
): HdrBadgeKind[] {
  const kinds: HdrBadgeKind[] = []
  if (isBooleanTruthy(dolbyVision)) kinds.push('dolby-vision')
  if (isBooleanTruthy(hdr10)) kinds.push('hdr10')
  if (isBooleanTruthy(hdr10Plus)) kinds.push('hdr10plus')
  return kinds
}

type DiscFormatBadgesProps = {
  discFormat: string
  dolbyDigital?: unknown
  dolbySurround?: unknown
  dolbyAtmos?: unknown
  dolbyTrueHd?: unknown
  stereo?: unknown
  dtsX?: unknown
  dtsHd?: unknown
  surround71?: unknown
  surround51?: unknown
  dolbyVision?: unknown
  hdr10?: unknown
  hdr10Plus?: unknown
}

export function DiscFormatBadges({
  discFormat,
  dolbyDigital,
  dolbySurround,
  dolbyAtmos,
  dolbyTrueHd,
  stereo,
  dtsX,
  dtsHd,
  surround71,
  surround51,
  dolbyVision,
  hdr10,
  hdr10Plus,
}: DiscFormatBadgesProps) {
  const formatKinds = discFormatKinds(discFormat)
  const audioKinds = audioBadgeKinds({
    dolbyDigital,
    dolbySurround,
    dolbyAtmos,
    dolbyTrueHd,
    stereo,
    dtsX,
    dtsHd,
    surround71,
    surround51,
  })
  const hdrKinds = hdrBadgeKinds(dolbyVision, hdr10, hdr10Plus)

  if (formatKinds.length === 0 && audioKinds.length === 0 && hdrKinds.length === 0) {
    return null
  }

  const labelParts = [
    discFormat.trim() || null,
    isBooleanTruthy(dolbyDigital) ? 'Dolby Digital' : null,
    isBooleanTruthy(dolbySurround) ? 'Dolby Surround' : null,
    isBooleanTruthy(dolbyAtmos) ? 'Dolby Atmos' : null,
    isBooleanTruthy(dolbyTrueHd) ? 'Dolby TrueHD' : null,
    isBooleanTruthy(stereo) ? 'Stereo' : null,
    isBooleanTruthy(dtsX)
      ? 'DTS:X'
      : isBooleanTruthy(dtsHd)
        ? 'DTS-HD MA'
        : null,
    isBooleanTruthy(surround71) ? '7.1' : isBooleanTruthy(surround51) ? '5.1' : null,
    isBooleanTruthy(dolbyVision) ? 'Dolby Vision' : null,
    isBooleanTruthy(hdr10) ? 'HDR10' : null,
    isBooleanTruthy(hdr10Plus) ? 'HDR10+' : null,
  ].filter(Boolean)

  return (
    <div className="disc-badges" aria-label={labelParts.join(', ')}>
      <div className="disc-badges__row">
        {formatKinds.length > 0 ? (
          <div className="disc-badges__formats">
            {formatKinds.map((kind) => (
              <BadgeImage key={kind} kind={kind} />
            ))}
          </div>
        ) : (
          <span className="disc-badges__spacer" aria-hidden="true" />
        )}

        {audioKinds.length > 0 ? (
          <div className="disc-badges__audio">
            {audioKinds.map((kind) => (
              <BadgeImage key={kind} kind={kind} />
            ))}
          </div>
        ) : null}

        {hdrKinds.length > 0 ? (
          <div className="disc-badges__hdr">
            {hdrKinds.map((kind) => (
              <BadgeImage key={kind} kind={kind} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
