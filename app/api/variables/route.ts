import { NextRequest, NextResponse } from 'next/server'
import { dataverseFetch } from '@/lib/borealis'
import { parseVariables } from '@/lib/parseVariables'

export async function GET(req: NextRequest) {
  const fileId        = req.nextUrl.searchParams.get('fileId')
  const signedUrlBase = req.nextUrl.searchParams.get('signedUrlBase')
  const siteUrl = req.nextUrl.searchParams.get('siteUrl') || undefined
  const token         = req.nextUrl.searchParams.get('token') || undefined

  if (!fileId) return NextResponse.json({ message: 'Missing fileId' }, { status: 400 })

  try {
    const res = signedUrlBase
      ? await fetch(`${signedUrlBase}/${fileId}/dataTables`)
      : await dataverseFetch(`/api/v1/files/${fileId}/dataTables`, token, siteUrl)

    if (!res.ok) return NextResponse.json(null)

    // Shared with demo mode so the two cannot drift; see lib/parseVariables.
    return NextResponse.json(parseVariables(await res.json()))
  } catch (e) {
    console.log('[variables] error:', e)
    return NextResponse.json(null)
  }
}
