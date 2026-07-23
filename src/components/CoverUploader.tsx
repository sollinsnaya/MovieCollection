import { useEffect, useId, useRef, useState } from 'react'
import { fetchCoverStatus, uploadCoverFile } from '../lib/coverApi'
import './CoverUploader.css'

type CoverUploaderProps = {
  title: string
  year?: number | null
  catalogId: string
  revision: number
  onUploaded: (publicPath: string) => void
}

export function CoverUploader({
  title,
  year = null,
  catalogId,
  revision,
  onUploaded,
}: CoverUploaderProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [exists, setExists] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    void fetchCoverStatus({ title, year, catalogId })
      .then((status) => {
        if (!cancelled) setExists(status.exists)
      })
      .catch(() => {
        if (!cancelled) setExists(null)
      })
    return () => {
      cancelled = true
    }
  }, [title, year, catalogId, revision])

  async function onFileChosen(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please choose a JPEG, PNG, or WebP image.')
      }
      const result = await uploadCoverFile({ title, year, catalogId, file })
      setExists(true)
      setMessage(
        result.replaced
          ? `Replaced cover. Removed ${result.deleted.length} old file${result.deleted.length === 1 ? '' : 's'}.`
          : 'Cover saved to public/covers/.',
      )
      onUploaded(result.publicPath)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not upload cover.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const label = exists ? 'Replace cover' : 'Add cover'

  return (
    <div className="cover-uploader">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        hidden
        disabled={busy}
        onChange={(event) => {
          void onFileChosen(event.target.files?.[0])
        }}
      />
      <button
        type="button"
        className="cover-uploader__button"
        disabled={busy || !title.trim()}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Uploading…' : label}
      </button>
      <p className="cover-uploader__hint">
        Saves as <code>{title.trim() || 'Title'}{year != null ? ` (${year})` : ''}.jpg</code> in the
        covers folder. Replacing deletes the previous local image(s) for this title.
      </p>
      {message ? (
        <p className="cover-uploader__status" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="cover-uploader__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
