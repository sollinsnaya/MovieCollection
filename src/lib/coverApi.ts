export type CoverStatusResponse = {
  exists: boolean
  publicPath: string | null
  files: Array<{
    filename: string
    publicPath: string
    kind: string
  }>
}

export type CoverUploadResponse = {
  ok: boolean
  filename: string
  publicPath: string
  deleted: string[]
  replaced: boolean
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`
}

export async function fetchCoverStatus(options: {
  title: string
  year?: number | string | null
  catalogId?: string
}): Promise<CoverStatusResponse> {
  const params = new URLSearchParams()
  if (options.title) params.set('title', options.title)
  if (options.year != null && options.year !== '') params.set('year', String(options.year))
  if (options.catalogId) params.set('catalogId', options.catalogId)

  const response = await fetch(`/api/covers/status?${params}`)
  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()) as CoverStatusResponse
}

export async function uploadCoverFile(options: {
  title: string
  year?: number | string | null
  catalogId?: string
  file: File
}): Promise<CoverUploadResponse> {
  const buffer = await options.file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  const data = btoa(binary)

  const response = await fetch('/api/covers/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: options.title,
      year: options.year ?? '',
      catalogId: options.catalogId ?? '',
      contentType: options.file.type || 'application/octet-stream',
      data,
    }),
  })

  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()) as CoverUploadResponse
}
