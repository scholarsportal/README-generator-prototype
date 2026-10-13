import type { DatasetMeta, DataFile, Variable, SignedUrls, VersionEntry } from './types'

// NOTE: this is the fallback host used when no siteUrl is supplied. It points at
// production Borealis, so a missing siteUrl during local development silently
// queries the live repository — which is how a local dataset PID once turned
// into a confusing "Dataset not found" error.
export const DEFAULT_SITE = 'https://borealisdata.ca'

// ── Dataset metadata ──────────────────────────────────────────────────────────
// UNUSED once page.tsx uses fetchVersions for everything. Kept until
// app/api/dataset/ is deleted; safe to remove together with that route.

export async function fetchDatasetMeta(
  pid: string,
  signed?: SignedUrls,
  token?: string,
  siteUrl?: string,
  version?: string
): Promise<DatasetMeta> {
  const params = new URLSearchParams({ pid })
  if (version) params.set('version', version)
  if (token) params.set('token', token)
  if (siteUrl) params.set('siteUrl', siteUrl)
  const headers: Record<string, string> = {}
  if (signed?.getDatasetMetadata) headers['x-signed-url'] = signed.getDatasetMetadata

  const res = await fetch(`/api/dataset?${params}`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── File listing ──────────────────────────────────────────────────────────────
// UNUSED once page.tsx uses fetchVersions for everything. Kept until
// app/api/files/ is deleted; safe to remove together with that route.

export async function fetchFiles(
  pid: string,
  version?: string,
  signed?: SignedUrls,
  token?: string,
  siteUrl?: string
): Promise<DataFile[]> {
  const params = new URLSearchParams({ pid })
  if (version) params.set("version", version)
  if (token) params.set('token', token)
  if (siteUrl) params.set('siteUrl', siteUrl)
  const headers: Record<string, string> = {}
  if (signed?.getFiles) headers['x-signed-url'] = signed.getFiles

  const res = await fetch(`/api/files?${params}`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Variable metadata ─────────────────────────────────────────────────────────

export async function fetchVariables(
  fileId: number,
  signed?: SignedUrls,
  token?: string,
  siteUrl?: string
): Promise<Variable[] | null> {
  const params = new URLSearchParams({ fileId: String(fileId) })
  if (signed?.getVariables) params.set('signedUrlBase', signed.getVariables)
  if (token) params.set('token', token)
  if (siteUrl) params.set('siteUrl', siteUrl)

  const res = await fetch(`/api/variables?${params}`)
  if (!res.ok) return null
  return res.json()
}

// ── Save README to dataset ────────────────────────────────────────────────────

export async function saveReadme(
  pid: string,
  token: string,
  markdown: string,
  signedUrl?: string,
  filename?: string,
  siteUrl?: string
): Promise<void> {
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pid, token, markdown, signedUrl, siteUrl, filename }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }
}

// ── Raw Dataverse fetch (used server-side in API routes) ──────────────────────

export async function dataverseFetch(path: string, token?: string, siteUrl?: string) {
  const base = siteUrl || DEFAULT_SITE
  const headers: Record<string, string> = {}
  if (token) headers['X-Dataverse-key'] = token
  return fetch(`${base}${path}`, { headers })
}

// ── Parse signed URLs from Dataverse query params ─────────────────────────────
// Dataverse does not send a `signedUrls` query parameter in the GET launch flow;
// signed URLs only arrive via the callback. This exists for the manual
// ?datasetPid=... entry path and is effectively dead. Remove once that path is
// retired.

export function parseSignedUrls(searchParams: URLSearchParams): SignedUrls | undefined {
  const raw = searchParams.get('signedUrls')
  if (!raw) return undefined
  try {
    const arr = JSON.parse(raw) as { name: string; signedUrl: string }[]
    const map: SignedUrls = {}
    for (const entry of arr) {
      if (entry.name === 'getDatasetMetadata') map.getDatasetMetadata = entry.signedUrl
      if (entry.name === 'getFiles')           map.getFiles           = entry.signedUrl
      if (entry.name === 'getVersions')        map.getVersions        = entry.signedUrl
      if (entry.name === 'getVariables')       map.getVariables       = entry.signedUrl
      if (entry.name === 'addFile')            map.addFile            = entry.signedUrl
    }
    return Object.keys(map).length ? map : undefined
  } catch {
    return undefined
  }
}

// ── Resolve callback URL ──────────────────────────────────────────────────────

export interface CallbackResult {
  pid: string
  signedUrls: SignedUrls
}

export async function resolveCallback(callbackParam: string): Promise<CallbackResult> {
  const callbackUrl = atob(callbackParam)
  const res = await fetch(`/api/callback?url=${encodeURIComponent(callbackUrl)}`)
  if (!res.ok) throw new Error(`Callback fetch failed: HTTP ${res.status}`)

  const json = await res.json()
  const pid: string = json?.data?.queryParameters?.datasetPid || json.datasetPid || json.pid || ''

  const arr: { name: string; signedUrl: string }[] = json?.data?.signedUrls || json.signedUrls || []
  const signedUrls: SignedUrls = {}
  for (const entry of arr) {
    if (entry.name === 'getDatasetMetadata') signedUrls.getDatasetMetadata = entry.signedUrl
    if (entry.name === 'getFiles')           signedUrls.getFiles           = entry.signedUrl
    if (entry.name === 'getVersions')        signedUrls.getVersions        = entry.signedUrl
    if (entry.name === 'getVariables')       signedUrls.getVariables       = entry.signedUrl
    if (entry.name === 'addFile')            signedUrls.addFile            = entry.signedUrl
  }

  if (!pid) throw new Error('Callback response did not include a dataset PID.')
  return { pid, signedUrls }
}

// ── Dataset versions ──────────────────────────────────────────────────────────
// Single source of truth: returns every version with its parsed metadata and its
// own file list, so switching versions in the UI needs no further requests.
//
// This is the only call that has to work. A signed URL is pinned to the exact
// string it was signed for, so a per-version fetch is impossible — but the
// /versions endpoint returns full metadataBlocks and files for every version at
// once, which sidesteps the limitation entirely.

export async function fetchVersions(
  pid: string,
  token?: string,
  siteUrl?: string,
  signed?: SignedUrls
): Promise<VersionEntry[]> {
  const params = new URLSearchParams({ pid })
  if (token) params.set('token', token)
  if (siteUrl) params.set('siteUrl', siteUrl)
  const headers: Record<string, string> = {}
  if (signed?.getVersions) headers['x-signed-url'] = signed.getVersions

  const res = await fetch(`/api/versions?${params}`, { headers })
  // Throws rather than returning [] — the old silent empty array made a 404
  // against the wrong host look like a dataset with no versions.
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }
  return res.json()
}
