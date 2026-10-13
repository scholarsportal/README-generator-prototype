import type { VersionEntry } from '../types'
import { parseVersion, parseFiles, versionLabel, versionValue } from '../parseVersion'

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
