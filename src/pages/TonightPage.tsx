import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CoverArt } from '../components/CoverArt'
import { useMoviesContext } from '../context/MoviesContext'
import { coverCandidates } from '../lib/covers'
import type { Movie } from '../types/movie'
import './TonightPage.css'

const SEGMENT_COUNT = 8
const SPIN_MS = 4800

const HOST_LINES = [
  'Contestant… come on down! Your next movie night is waiting behind one of these covers.',
  'We’ve got a shelf full of beauties. Give that wheel a whirl and let’s make a winner!',
  'Ladies and gentlemen — tonight’s showcase of cinematic prizes is ready. Who’s feeling lucky?',
  'Don’t just stare at the shelf. Spin it. Win it. Watch it.',
]

const SPINNING_LINES = [
  'Around she goes… where she stops, nobody knows!',
  'Keep those eyes on the pointer… this one’s going the distance!',
  'The tension is killing me — and I don’t even eat popcorn!',
]

const WIN_LINES = [
  'That’s a fabulous prize from your own collection!',
  'What a showcase! Pop it in and enjoy the evening.',
  'Come on down and claim your movie night!',
  'A brand-new (to tonight) classic, just for you!',
]

function pickLine(lines: string[], exclude?: string): string {
  const pool = exclude ? lines.filter((line) => line !== exclude) : lines
  return pool[Math.floor(Math.random() * pool.length)] ?? lines[0]!
}

function shuffleSample(movies: Movie[], count: number): Movie[] {
  const copy = [...movies]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy.slice(0, Math.min(count, copy.length))
}

function wedgeClipPath(index: number, count: number): string {
  const startDeg = (index / count) * 360 - 90
  const endDeg = ((index + 1) / count) * 360 - 90
  const toPoint = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return `${50 + 50 * Math.cos(rad)}% ${50 + 50 * Math.sin(rad)}%`
  }
  const steps = Math.max(2, Math.ceil((endDeg - startDeg) / 12))
  const rim: string[] = []
  for (let step = 0; step <= steps; step += 1) {
    const deg = startDeg + ((endDeg - startDeg) * step) / steps
    rim.push(toPoint(deg))
  }
  return `polygon(50% 50%, ${rim.join(', ')})`
}

function rotationForWinner(index: number, count: number, turns = 6): number {
  const segment = 360 / count
  const centerFromTop = (index + 0.5) * segment
  const jitter = (Math.random() - 0.5) * segment * 0.5
  return turns * 360 - centerFromTop + jitter
}

function SegmentCover({ movie }: { movie: Movie }) {
  const candidates = useMemo(
    () => coverCandidates(movie.title, movie.year, movie.catalogId),
    [movie.title, movie.year, movie.catalogId],
  )
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState(candidates.length === 0)

  useEffect(() => {
    setIndex(0)
    setFailed(candidates.length === 0)
  }, [candidates])

  if (failed || index >= candidates.length) {
    return (
      <div className="tonight-page__segment-fallback" aria-hidden="true">
        <span>{movie.title}</span>
      </div>
    )
  }

  return (
    <img
      className="tonight-page__segment-art"
      src={candidates[index]}
      alt=""
      draggable={false}
      onError={() => {
        if (index + 1 < candidates.length) {
          setIndex((current) => current + 1)
        } else {
          setFailed(true)
        }
      }}
    />
  )
}

export function TonightPage() {
  const { status, message, movies } = useMoviesContext()
  const [segments, setSegments] = useState<Movie[]>([])
  const [spinning, setSpinning] = useState(false)
  const [pick, setPick] = useState<Movie | null>(null)
  const [rotation, setRotation] = useState(0)
  const [spinningClass, setSpinningClass] = useState(false)
  const [hostLine, setHostLine] = useState(HOST_LINES[0]!)
  const [winLine, setWinLine] = useState(WIN_LINES[0]!)

  useEffect(() => {
    if (movies.length === 0) {
      setSegments([])
      return
    }
    setSegments(shuffleSample(movies, SEGMENT_COUNT))
    setHostLine(pickLine(HOST_LINES))
  }, [movies])

  function spin() {
    if (movies.length === 0 || spinning) return

    const lineup = shuffleSample(movies, SEGMENT_COUNT)
    const winnerIndex = Math.floor(Math.random() * lineup.length)
    const winner = lineup[winnerIndex]!
    const nextRotation = rotation + rotationForWinner(winnerIndex, lineup.length)

    setPick(null)
    setSegments(lineup)
    setHostLine(pickLine(SPINNING_LINES, hostLine))
    setSpinning(true)
    setSpinningClass(false)

    requestAnimationFrame(() => {
      setSpinningClass(true)
      setRotation(nextRotation)
    })

    window.setTimeout(() => {
      setPick(winner)
      setWinLine(pickLine(WIN_LINES))
      setHostLine(pickLine(HOST_LINES))
      setSpinning(false)
      setSpinningClass(false)
    }, SPIN_MS)
  }

  if (status === 'loading') {
    return (
      <div className="status-panel" role="status">
        <p>Warming up the showcase lights…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="status-panel status-panel--error" role="alert">
        <h1>Could not load collection</h1>
        <p>{message}</p>
      </div>
    )
  }

  const count = segments.length || SEGMENT_COUNT

  return (
    <section className="tonight-page">
      <header className="tonight-page__intro">
        <p className="tonight-page__kicker">Live from your living room</p>
        <h1>Come on down!</h1>
        <p className="tonight-page__tagline">
          It’s time to play <em>What to Watch Tonight</em> — spin the big wheel and win a movie from
          your own shelf.
        </p>
        <p className="tonight-page__host" aria-live="polite">
          {hostLine}
        </p>
      </header>

      {movies.length === 0 ? (
        <p className="tonight-page__empty">
          No prizes in the showcase yet — add some movies, then come on back for a spin!
        </p>
      ) : (
        <>
          <div className={`tonight-page__stage${spinning ? ' tonight-page__stage--live' : ''}`}>
            <div className="tonight-page__lights" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <p className="tonight-page__marquee">Showcase · 8 random titles · Fresh lineup every spin</p>

            <div className="tonight-page__wheel-wrap">
              <div className="tonight-page__pointer" aria-hidden="true">
                <span />
              </div>
              <div
                className={`tonight-page__tilt${!spinning && !pick ? ' tonight-page__tilt--idle' : ''}`}
              >
                <div
                  className={`tonight-page__wheel${spinningClass ? ' tonight-page__wheel--spinning' : ''}`}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transitionDuration: spinningClass ? `${SPIN_MS}ms` : '0ms',
                  }}
                  role="img"
                  aria-label="Prize wheel of movie covers"
                >
                  {segments.map((movie, index) => (
                    <div
                      key={`${movie.catalogId}-${index}`}
                      className="tonight-page__segment"
                      style={{ clipPath: wedgeClipPath(index, count) }}
                    >
                      <SegmentCover movie={movie} />
                    </div>
                  ))}
                  <div
                    className="tonight-page__spokes"
                    style={{
                      background: `repeating-conic-gradient(
                        from calc(-0.5turn / ${count}),
                        transparent 0 calc(360deg / ${count} - 1.5deg),
                        rgba(255, 230, 170, 0.55) calc(360deg / ${count} - 1.5deg) calc(360deg / ${count})
                      )`,
                    }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="tonight-page__hub" aria-hidden="true">
                <span>SPIN</span>
              </div>
            </div>

            <button type="button" className="tonight-page__spin" onClick={spin} disabled={spinning}>
              {spinning ? 'She’s spinning…' : pick ? 'Spin for another prize!' : 'Spin the wheel!'}
            </button>
          </div>

          {pick && !spinning ? (
            <div className="tonight-page__result" key={pick.catalogId}>
              <p className="tonight-page__result-banner">And the winner is…</p>
              <div className="tonight-page__result-body">
                <CoverArt
                  catalogId={pick.catalogId}
                  title={pick.title}
                  year={pick.year}
                  size="card"
                />
                <div className="tonight-page__result-copy">
                  <p className="tonight-page__eyebrow">Your showcase prize</p>
                  <h2>{pick.title}</h2>
                  <p className="tonight-page__result-meta">
                    {[pick.year ?? 'Year unknown', pick.director].filter(Boolean).join(' · ')}
                  </p>
                  <p className="tonight-page__win-line">{winLine}</p>
                  <Link
                    className="tonight-page__claim"
                    to={`/movie/${encodeURIComponent(pick.catalogId)}`}
                  >
                    Claim your prize
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
