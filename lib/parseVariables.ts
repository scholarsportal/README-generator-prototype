import type { Variable } from './types'

type RawVariable = {
  name: string
  label?: string
  variableFormatType?: string | { name: string }
  type?: string
}

/**
 * Map a Dataverse /files/{id}/dataTables response into Variable[].
 *
 * Shared by the API route and by demo mode so the two cannot drift. Returns
 * null when the file has no variable metadata, which the UI shows as a note
 * rather than an empty table.
 */
export function parseVariables(json: unknown): Variable[] | null {
  const rawVars: RawVariable[] =
    (json as { data?: { dataVariables?: RawVariable[] }[] })?.data?.[0]?.dataVariables || []

  const variables: Variable[] = rawVars.map((v) => ({
    name: v.name,
    label: v.label || '',
    // Dataverse sends "CHARACTER" / "NUMERIC" as a plain string; the object
    // form is kept for older installations.
    type:
      typeof v.variableFormatType === 'string'
        ? v.variableFormatType
        : v.variableFormatType?.name || v.type || '',
  }))

  return variables.length ? variables : null
}
