import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { completeJSON } from '@/lib/ai/provider'
import { extractContent } from '@/lib/documents/extract-text'

interface AnalysisResult {
  category: 'PLEADING' | 'CORRESPONDENCE' | 'MOTION' | 'NOTICE' | 'DISCOVERY'
  subcategory: string | null
  jurisdiction: string | null
  courtType: string | null
  summary: string
  detectedFields: string[]
  suggestedFields: { field: string; reason: string }[]
  cleanedContent: string
}

const SYSTEM_PROMPT = `You are a legal document template analyst for a criminal defense law firm. Given the text of a legal document template, analyze it and return a JSON object with these fields:

- "category": one of PLEADING, CORRESPONDENCE, MOTION, NOTICE, DISCOVERY — pick the best fit
- "subcategory": a short label like "Motion to Suppress", "Plea Agreement", "Subpoena Duces Tecum", etc. or null
- "jurisdiction": the state abbreviation (e.g. "MN", "IN") if detectable from the content, or null
- "courtType": one of CIRCUIT, SUPERIOR, DISTRICT, FEDERAL_DISTRICT if detectable, or null
- "summary": 1-2 sentence plain-language description of what this template is for
- "detectedFields": array of merge field names already present as {{field_name}} placeholders in the text
- "suggestedFields": array of objects { "field": "field_name", "reason": "why this should be a placeholder" } for parts of the template that are clearly fill-in-the-blank but are NOT yet wrapped in {{}}. Look for: party names, case numbers, dates, judge names, court names, addresses, amounts, charge descriptions, statute numbers, etc. that appear as literal text but should be dynamic.
- "cleanedContent": the full template text with suggested fields converted to {{field_name}} placeholders. Keep all existing {{}} placeholders. Only convert text that is clearly meant to be filled in per-case. Preserve all formatting and line breaks.

IMPORTANT: Only suggest fields for text that is clearly a fill-in-the-blank value (a specific name, date, number, address). Do NOT suggest fields for boilerplate legal language.`

export async function POST(request: NextRequest) {
  const denied = await requirePermission('templates', 'create')
  if (denied) return denied

  try {
    const contentType = request.headers.get('content-type') || ''

    let templateText: string

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const extracted = await extractContent(buffer, file.name, file.type)
      if (extracted.isImage) {
        return NextResponse.json({ error: 'Image files are not supported as templates' }, { status: 400 })
      }
      templateText = extracted.text
    } else {
      const body = await request.json()
      templateText = body.content
      if (!templateText || typeof templateText !== 'string') {
        return NextResponse.json({ error: 'No content provided' }, { status: 400 })
      }
    }

    if (templateText.length > 500000) {
      return NextResponse.json({ error: 'Template content too large (max 500KB)' }, { status: 400 })
    }

    const analysis = await completeJSON<AnalysisResult>(
      SYSTEM_PROMPT,
      `Analyze this legal document template:\n\n${templateText}`,
      { tier: 'standard', temperature: 0.2 }
    )

    return NextResponse.json({
      ...analysis,
      originalContent: templateText,
    })
  } catch (error) {
    console.error('Template analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze template' }, { status: 500 })
  }
}
