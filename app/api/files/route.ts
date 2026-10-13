import { NextRequest, NextResponse } from 'next/server'
import { dataverseFetch } from '@/lib/borealis'
import type { DataFile } from '@/lib/types'

export async function GET(req: NextRequest) {
  const pid        = req.nextUrl.searchParams.get('pid')
  const version    = req.nextUrl.searchParams.get('version') || ':latest'
  const signedUrlRaw = req.headers.get('x-signed-url') || req.nextUrl.searchParams.get('signedUrl')
  const signedUrl  = signedUrlRaw ? decodeURIComponent(signedUrlRaw) : null
  const token      = req.nextUrl.searchParams.get('token') || undefined
  const siteUrl    = req.nextUrl.searchParams.get('siteUrl') || undefined

  if (!pid && !signedUrl) {
    return NextResponse.json({ message: 'Missing pid or signedUrl' }, { status: 400 })
  }

  try {
    const res = signedUrl
      ? await fetch(signedUrl)
      : await dataverseFetch(
          `/api/v1/datasets/:persistentId/versions/${version}/files?persistentId=${encodeURIComponent(pid!)}`,
          token,
          siteUrl
        )

    if (!res.ok) return NextResponse.json([], { status: 200 })

    const json = await res.json()
    const files: DataFile[] = (json.data || []).map(
      (f: {
        dataFile?: { id: number; filename: string; filesize: number; contentType: string; restricted?: boolean }
        label?: string
        directoryLabel?: string
        description?: string
        categories?: string[]
        restricted?: boolean
      }) => ({
        id:             f.dataFile?.id ?? 0,
        name:           f.dataFile?.filename || f.label || 'unnamed',
        size:           f.dataFile?.filesize ?? 0,
        contentType:    f.dataFile?.contentType || '',
        directoryLabel: f.directoryLabel || '',
        description:    f.description || '',
        tags:           (f.categories || []).join(', '),
        restricted:     f.restricted ?? false,
      })
    )

    return NextResponse.json(files)
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 500 })
  }
}
