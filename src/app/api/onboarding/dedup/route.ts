import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { findClientMatches, type ExtractedClientInfo } from '@/lib/clients/dedup'
import { sanitizeAIError } from '@/lib/ai/errors'
import { aura } from '@/lib/agents'

export const dynamic = 'force-dynamic'

interface DocumentSnippet {
  fileName: string
  textSnippet: string
  documentDate?: string | null
  documentType?: string | null
}

interface DocumentComparison {
  existingDocName: string
  newDocName: string
  similarity: 'identical' | 'updated' | 'different'
  existingDocDate: string | null
  newDocDate: string | null
  explanation: string
}

export async function POST(request: Request) {
  const denied = await requirePermission('clients', 'view')
  if (denied) return denied

  try {
    const body = await request.json()
    const clientInfo: ExtractedClientInfo = body.clientInfo
    const documents: DocumentSnippet[] = body.documents || []

    if (!clientInfo || !clientInfo.name) {
      return NextResponse.json(
        { error: 'clientInfo with at least a name is required' },
        { status: 400 }
      )
    }

    // Find client matches using multi-point dedup
    const matches = await findClientMatches(clientInfo)

    // For each match, compare uploaded documents against existing via AURA
    const matchesWithComparisons = await Promise.all(
      matches.map(async (match) => {
        const documentComparisons: DocumentComparison[] = []

        if (match.client.documents.length > 0 && documents.length > 0) {
          for (const newDoc of documents) {
            const existingCandidates = match.client.documents.filter(
              (ed) => ed.documentType === newDoc.documentType
            )
            const toCompare = existingCandidates.length > 0
              ? existingCandidates
              : match.client.documents.slice(0, 3)

            for (const existingDoc of toCompare) {
              let existingSnippet = ''
              if (existingDoc.analysisResult) {
                try {
                  const analysis = JSON.parse(existingDoc.analysisResult)
                  existingSnippet = [
                    analysis.summary || '',
                    ...(analysis.keyFindings || []),
                    ...(analysis.riskFactors || []),
                  ].join('\n').slice(0, 3000)
                } catch {
                  existingSnippet = existingDoc.analysisResult.slice(0, 3000)
                }
              }

              if (!existingSnippet && !newDoc.textSnippet) continue

              // Delegate to AURA agent for document comparison
              const result = await aura.compareDocuments({
                existingDoc: {
                  name: existingDoc.documentName,
                  date: existingDoc.documentDate?.toISOString().split('T')[0] || null,
                  snippet: existingSnippet,
                },
                newDoc: {
                  name: newDoc.fileName,
                  date: newDoc.documentDate || null,
                  snippet: newDoc.textSnippet,
                },
              })

              if (result.success && result.data) {
                documentComparisons.push({
                  existingDocName: existingDoc.documentName,
                  newDocName: newDoc.fileName,
                  similarity: result.data.similarity,
                  existingDocDate: existingDoc.documentDate?.toISOString().split('T')[0] || null,
                  newDocDate: newDoc.documentDate || null,
                  explanation: result.data.explanation,
                })
              } else {
                documentComparisons.push({
                  existingDocName: existingDoc.documentName,
                  newDocName: newDoc.fileName,
                  similarity: 'different',
                  existingDocDate: existingDoc.documentDate?.toISOString().split('T')[0] || null,
                  newDocDate: newDoc.documentDate || null,
                  explanation: 'Could not determine similarity',
                })
              }
            }
          }
        }

        return {
          client: match.client,
          matchType: match.matchType,
          matchPoints: match.matchPoints,
          overallConfidence: match.overallConfidence,
          documentComparisons,
        }
      })
    )

    return NextResponse.json({ matches: matchesWithComparisons })
  } catch (error) {
    const safe = sanitizeAIError(error)
    return NextResponse.json({ error: safe.message }, { status: safe.status })
  }
}
