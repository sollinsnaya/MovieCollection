import './RottenTomatoesBadge.css'

export type TomatoRating = 'certified-fresh' | 'fresh' | 'rotten'

/** Parse values like "88%", "88", "88.0". */
export function parseTomatoScore(value: unknown): number | null {
  const text = String(value ?? '').trim()
  if (!text) return null
  const match = text.match(/(\d+(?:\.\d+)?)\s*%?/)
  if (!match) return null
  const score = Number(match[1])
  if (!Number.isFinite(score) || score < 0 || score > 100) return null
  return Math.round(score)
}

/**
 * RT-style thresholds:
 * - Certified Fresh: 75%+
 * - Fresh: above 60%
 * - Rotten: 60% or below
 */
export function tomatoRatingForScore(score: number): TomatoRating {
  if (score >= 75) return 'certified-fresh'
  if (score > 60) return 'fresh'
  return 'rotten'
}

function FreshTomatoIcon({ certified = false }: { certified?: boolean }) {
  return (
    <svg className="rt-badge__icon" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="36" rx="22" ry="20" fill="#fa320a" />
      <ellipse cx="24" cy="30" rx="6" ry="4" fill="#ff6b4a" opacity="0.45" />
      <path
        d="M20 18c4-8 12-10 16-4 3-7 12-8 16 0-6 2-10 6-16 6-6 0-11-3-16-2z"
        fill="#2f8f2c"
      />
      <path d="M32 14v10" stroke="#1f6b1d" strokeWidth="2.5" strokeLinecap="round" />
      {certified ? (
        <g>
          <circle cx="48" cy="48" r="11" fill="#fa320a" stroke="#fff" strokeWidth="2" />
          <path
            d="M43.5 48.2l3.2 3.2 6.2-6.8"
            fill="none"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : null}
    </svg>
  )
}

function RottenTomatoIcon() {
  return (
    <svg className="rt-badge__icon" viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M12 28c2-10 12-16 22-14 8-8 20-4 24 6 6 2 8 12 2 20-2 10-12 16-22 14-10 4-20-2-24-12-4-4-4-10-2-14z"
        fill="#6cbf2e"
      />
      <path
        d="M18 34c6 2 8 10 4 16M28 24c4 8 14 8 18 2M40 38c-2 6 2 12 8 12"
        fill="none"
        stroke="#4a9a18"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="26" cy="32" r="2.2" fill="#3d7a14" />
      <circle cx="38" cy="42" r="1.8" fill="#3d7a14" />
      <path d="M30 16c2 4 6 6 10 4" stroke="#2f6b12" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

type RottenTomatoesBadgeProps = {
  scoreValue: unknown
}

export function RottenTomatoesBadge({ scoreValue }: RottenTomatoesBadgeProps) {
  const score = parseTomatoScore(scoreValue)
  if (score == null) return null

  const rating = tomatoRatingForScore(score)
  const label =
    rating === 'certified-fresh'
      ? 'Certified Fresh'
      : rating === 'fresh'
        ? 'Fresh'
        : 'Rotten'

  return (
    <aside
      className={`rt-badge rt-badge--${rating}`}
      aria-label={`Rotten Tomatoes ${label}: ${score}%`}
    >
      {rating === 'rotten' ? <RottenTomatoIcon /> : <FreshTomatoIcon certified={rating === 'certified-fresh'} />}
      <div className="rt-badge__text">
        <span className="rt-badge__score">{score}%</span>
        <span className="rt-badge__label">{label}</span>
      </div>
    </aside>
  )
}
