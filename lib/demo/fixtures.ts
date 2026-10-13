import type { VersionEntry, Variable } from '../types'
import { parseVariables } from '../parseVariables'
import { versionsFromRaw } from './index'
import fixture from './fixture.json'
import variableFixture from './variables.json'

/**
 * The bundled sample dataset.
 *
 * Imported dynamically from lib/borealis.ts so the JSON lands in its own chunk
 * and never reaches the external-tool build — see the note in ./index.
 */

/** The bundled dataset, as VersionEntry[]. */
export function demoVersions(): VersionEntry[] {
  return versionsFromRaw(fixture)
}

/**
 * Variable metadata for one file id.
 *
 * Only the fixture's own ids are present. A dataset pasted in by the viewer
 * will not match, so this returns null for anything else and the Variables
 * section shows its "no metadata" note — the honest result, since there is no
 * server to fetch it from.
 */
export function demoVariables(fileId: number): Variable[] | null {
  const table = (variableFixture as Record<string, unknown>)[String(fileId)]
  if (!table) return null
  return parseVariables(table)
}
