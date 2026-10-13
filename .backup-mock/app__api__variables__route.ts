import { NextRequest, NextResponse } from 'next/server'
import { dataverseFetch } from '@/lib/borealis'
import { MOCK_VARIABLES } from '@/lib/mock'
import type { Variable } from '@/lib/types'

const USE_MOCK = process.env.USE_MOCK === 'true'
const MOCK_FILE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

export async function GET(req: NextRequest) {
  const fileId        = req.nextUrl.searchParams.get('fileId')
  const signedUrlBase = req.nextUrl.searchParams.get('signedUrlBase')
  const siteUrl = req.nextUrl.searchParams.get('siteUrl') || undefined
  const token         = req.nextUrl.searchParams.get('token') || undefined

  if (!fileId) return NextResponse.json({ message: 'Missing fileId' }, { status: 400 })

  if (USE_MOCK && MOCK_FILE_IDS.has(Number(fileId))) {
    await new Promise((r) => setTimeout(r, 100))
    const vars = MOCK_VARIABLES[Number(fileId)] || null
    return NextResponse.json(vars)
  }

  try {
    const res = signedUrlBase
      ? await fetch(`${signedUrlBase}/${fileId}/dataTables`)
      : await dataverseFetch(`/api/v1/files/${fileId}/dataTables`, token, siteUrl)

    if (!res.ok) return NextResponse.json(null)

    const json    = await res.json()
    const rawVars = json.data?.[0]?.dataVariables || []
    const variables: Variable[] = rawVars.map(
      (v: { name: string; label?: string; variableFormatType?: { name: string }; type?: string }) => ({
        name:  v.name,
        label: v.label || '',
        type:  v.variableFormatType?.name || v.type || '',
      })
    )

    return NextResponse.json(variables.length ? variables : null)
  } catch (e) {
    console.log('[variables] error:', e)
    return NextResponse.json(null)
  }
}
