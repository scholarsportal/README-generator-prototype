import type { VersionEntry, Variable } from '../types'
import { parseVersion, parseFiles, versionLabel, versionValue } from '../parseVersion'
import { parseVariables } from '../parseVariables'

/**
 * Demo mode.
 *
 * The app is normally a Dataverse external tool: the browser cannot call
 * Dataverse directly (no CORS for arbitrary origins, and a token would have to
 * be exposed), so every read goes through an API route acting as a proxy. A
 * static build — GitHub Pages — has no server to proxy through, so in demo mode
 * the four functions in lib/borealis.ts resolve from bundled fixtures instead
 * of calling /api/*.
 *
 * Everything downstream is untouched: the fixture is a real captured /versions
 * response and goes through the same parseVersion → buildSections →
 * generateReadme path as production. A parallel implementation for the demo
 * would drift from the real one.
 *
 * NOTE ON WHAT LIVES WHERE. This module must never import the fixture JSON.
 * page.tsx imports versionsFromRaw from here, so anything this module pulls in
 * is pulled into the production bundle too — which is how 68 KB of demo data
 * ended up shipping in the external tool before the split. The fixtures live in
 * ./fixtures and are reached only through a dynamic import, inside a branch
 * that is statically false in a non-demo build.
 */
export const DEMO = process.env.NEXT_PUBLIC_DEMO === '1'

/** Fixed, so the demo never looks like it is talking to a real repository. */
export const DEMO_SITE_URL = 'https://demo.invalid'

/**
 * Map a raw Dataverse /versions payload into VersionEntry[].
 *
 * The same mapping app/api/versions/route.ts performs. It lives here because
 * demo mode needs it in the browser — both for the bundled fixture and for a
 * payload someone pastes in.
 */
export function versionsFromRaw(json: unknown): VersionEntry[] {
  const raw = (json as { data?: unknown[] })?.data
  if (!Array.isArray(raw)) {
    throw new Error(
      'That JSON has no "data" array. Paste the whole response from ' +
        '/api/datasets/:persistentId/versions, including the {"status":"OK","data":[…]} wrapper.'
    )
  }
  if (!raw.length) throw new Error('That response contains no dataset versions.')

  return raw.map((v: any) => ({
    label: versionLabel(v),
    value: versionValue(v),
    state: v?.versionState,
    meta: parseVersion(v),
    files: parseFiles(v?.files),
  }))
}

// ── Loading a real public dataset ───────────────────────────────────────────
//
// The demo is static, so there is no proxy — the browser calls Dataverse
// directly. That works only for PUBLIC datasets and only because Dataverse
// serves its API with `Access-Control-Allow-Origin: *` (the :AllowCors
// setting). No API token is involved and none would help: a token in
// client-side JavaScript on a public page would be readable by anyone.
//
// Drafts and restricted files are therefore out of reach here, which is fine —
// they are exactly the cases that need the real external tool.

export const PUBLIC_SITE = 'https://readme-gen-proxy.sp-metrics.workers.dev'

/**
 * Accept whatever someone pastes and turn it into a Dataverse persistentId.
 *
 * All of these are the same dataset:
 *   doi:10.5683/SP3/ABCDEF
 *   10.5683/SP3/ABCDEF
 *   https://doi.org/10.5683/SP3/ABCDEF
 *   https://borealisdata.ca/dataset.xhtml?persistentId=doi:10.5683/SP3/ABCDEF
 *   https://borealisdata.ca/citation?persistentId=doi:10.5683/SP3/ABCDEF
 */
export function normalizeDoi(input: string): string {
  let s = input.trim()
  if (!s) return ''

  // A dataset page URL carries the id in a query parameter.
  const q = s.match(/[?&]persistentId=([^&#]+)/i)
  if (q) {
    s = decodeURIComponent(q[1]).trim()
  } else {
    // Strip a resolver prefix: https://doi.org/10.5683/… → 10.5683/…
    s = s.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    s = s.replace(/^https?:\/\/hdl\.handle\.net\//i, 'hdl:')
  }

  // Already prefixed (doi:, hdl:, perma:) — leave it alone.
  if (/^[a-z]+:/i.test(s)) return s
  // A bare DOI starts with the registrant code, e.g. 10.5683/SP3/ABCDEF.
  if (/^10\.\d{4,9}\//.test(s)) return 'doi:' + s
  return s
}

/** Fetch every version of a public dataset straight from the repository. */
export async function fetchPublicVersions(
  doi: string,
  siteUrl: string = PUBLIC_SITE
): Promise<VersionEntry[]> {
  const pid = normalizeDoi(doi)
  if (!pid) throw new Error('Enter a DOI.')
  if (!/^(doi|hdl|perma):/i.test(pid)) {
    throw new Error(
      `"${doi.trim()}" does not look like a DOI. It should look like ` +
        'doi:10.5683/SP3/ABCDEF, or paste the dataset page URL.'
    )
  }

  const url =
    `${siteUrl.replace(/\/$/, '')}/datasets/:persistentId/versions` +
    `?persistentId=${encodeURIComponent(pid)}`

  let res: Response
  try {
    res = await fetch(url)
  } catch {
    // A network-level failure here is almost always CORS or the dataset being
    // behind a login, and the browser deliberately hides which.
    throw new Error(
      'Could not reach the repository. This page can only read datasets that ' +
        'are published and publicly visible.'
    )
  }

  if (res.status === 404) {
    throw new Error(`No published dataset found for ${pid}.`)
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `${pid} is not publicly readable. Drafts and restricted datasets need ` +
        'the real tool, launched from the dataset page.'
    )
  }
  if (!res.ok) {
    throw new Error(`The repository returned HTTP ${res.status}.`)
  }

  return versionsFromRaw(await res.json())
}

/** Variable metadata for one file of a public dataset. */
export async function fetchPublicVariables(
  fileId: number,
  siteUrl: string
): Promise<Variable[] | null> {
  try {
    const res = await fetch(
      `${siteUrl.replace(/\/$/, '')}/files/${fileId}/dataTables`
    )
    if (!res.ok) return null
    return parseVariables(await res.json())
  } catch {
    return null
  }
}
