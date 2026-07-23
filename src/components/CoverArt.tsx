import { useEffect, useMemo, useState } from 'react'
import { coverCandidates } from '../lib/covers'
import './CoverArt.css'

type CoverArtProps = {
  catalogId: string
  title: string
  year?: number | null
  size?: 'card' | 'detail'
  /** Bump to force reload after an upload/replace. */
  revision?: number | string
}

export function CoverArt({
  catalogId,
  title,
  year = null,
  size = 'card',
  revision = 0,
}: CoverArtProps) {
  const candidates = useMemo(() => {
    const paths = coverCandidates(title, year, catalogId)
    const bust = revision ? `?v=${encodeURIComponent(String(revision))}` : ''
    return paths.map((path) => `${path}${bust}`)
  }, [title, year, catalogId, revision])

  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState(candidates.length === 0)

  useEffect(() => {
    setIndex(0)
    setFailed(candidates.length === 0)
  }, [catalogId, title, year, revision, candidates.length])

  if (failed || index >= candidates.length) {
    return (
      <div
        className={`cover-art cover-art--placeholder cover-art--${size}`}
        aria-label={`${title} cover unavailable`}
      >
        <div className="cover-art__spine" aria-hidden="true" />
        <div className="cover-art__placeholder-body">
          <span className="cover-art__mark">4K</span>
          <span className="cover-art__placeholder-title">{title}</span>
          <span className="cover-art__placeholder-id">{catalogId}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`cover-art cover-art--${size}`}>
      <img
        className="cover-art__image"
        src={candidates[index]}
        alt={`Cover for ${title}`}
        loading="lazy"
        onError={() => {
          if (index + 1 < candidates.length) {
            setIndex((current) => current + 1)
          } else {
            setFailed(true)
          }
        }}
      />
    </div>
  )
}
