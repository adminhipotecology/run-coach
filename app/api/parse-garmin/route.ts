import { createClient } from '@/lib/supabase/server'
import { parseFitFile, parseCsvFile } from '@/lib/garmin-parser'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.fit')) {
      const buffer = await file.arrayBuffer()
      const run = await parseFitFile(buffer)
      return NextResponse.json({ success: true, run })
    }

    if (fileName.endsWith('.csv')) {
      const text = await file.text()
      const run = parseCsvFile(text)
      return NextResponse.json({ success: true, run })
    }

    return NextResponse.json(
      { error: 'Unsupported file format. Please upload a .fit or .csv file.' },
      { status: 400 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse file'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
