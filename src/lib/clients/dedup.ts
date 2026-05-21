import { prisma } from '@/lib/prisma'
import { compareTwoStrings } from 'string-similarity'

export interface ExtractedClientInfo {
  name?: string | null
  legalName?: string | null
  dunsNumber?: string | null
  address?: {
    street?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    zip?: string | null
  } | null
  phone?: string | null
  primaryContactName?: string | null
  primaryContactEmail?: string | null
  primaryContactPhone?: string | null
  industry?: string | null
  website?: string | null
}

export interface MatchPoint {
  field: string
  score: number
  detail: string
}

export interface DedupMatch {
  client: {
    id: string
    name: string
    legalName: string | null
    dunsNumber: string | null
    website: string | null
    industry: string | null
    country: string | null
    stateProvince: string | null
    primaryContactName: string | null
    primaryContactEmail: string | null
    primaryContactPhone: string | null
    status: string
    documents: {
      id: string
      documentName: string
      documentType: string
      documentDate: Date | null
      analysisResult: string | null
      status: string
    }[]
  }
  matchType: 'strong' | 'fuzzy'
  matchPoints: MatchPoint[]
  overallConfidence: number
}

/** Normalize a phone number to digits only for comparison */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/** Normalize a string for comparison (lowercase, trim, collapse whitespace) */
function normalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Build a comparable address string */
function normalizeAddress(addr: ExtractedClientInfo['address']): string {
  if (!addr) return ''
  const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country]
    .filter(Boolean)
    .map(s => normalize(s))
  return parts.join(' ')
}

const FUZZY_THRESHOLD = 0.7

/**
 * Find potential client matches using multi-point deduplication.
 *
 * Strong match: Exact DUNS number match
 * Fuzzy match: 2+ weak matches with score > 0.7 on name/phone/address/contacts
 */
export async function findClientMatches(info: ExtractedClientInfo): Promise<DedupMatch[]> {
  const results: DedupMatch[] = []

  // Fetch all active/pending clients with their documents
  const clients = await prisma.client.findMany({
    where: { status: { in: ['ACTIVE', 'PENDING', 'INACTIVE'] } },
    include: {
      documents: {
        where: { isCurrent: true },
        select: {
          id: true,
          documentName: true,
          documentType: true,
          documentDate: true,
          analysisResult: true,
          status: true,
        },
        orderBy: { uploadDate: 'desc' },
      },
    },
  })

  for (const client of clients) {
    const matchPoints: MatchPoint[] = []

    // 1. DUNS exact match (strong)
    if (info.dunsNumber && client.dunsNumber) {
      const extractedDuns = info.dunsNumber.trim()
      const clientDuns = client.dunsNumber.trim()
      if (extractedDuns === clientDuns) {
        matchPoints.push({
          field: 'dunsNumber',
          score: 1.0,
          detail: `Exact DUNS match: ${clientDuns}`,
        })
      }
    }

    // 2. Name fuzzy match
    if (info.name) {
      const nameScores: number[] = []
      if (client.name) {
        nameScores.push(compareTwoStrings(normalize(info.name), normalize(client.name)))
      }
      if (client.legalName) {
        nameScores.push(compareTwoStrings(normalize(info.name), normalize(client.legalName)))
      }
      if (info.legalName) {
        if (client.name) {
          nameScores.push(compareTwoStrings(normalize(info.legalName), normalize(client.name)))
        }
        if (client.legalName) {
          nameScores.push(compareTwoStrings(normalize(info.legalName), normalize(client.legalName)))
        }
      }
      const bestNameScore = Math.max(0, ...nameScores)
      if (bestNameScore >= FUZZY_THRESHOLD) {
        matchPoints.push({
          field: 'name',
          score: bestNameScore,
          detail: `Name similarity: "${info.name}" ↔ "${client.name}"${client.legalName ? ` / "${client.legalName}"` : ''}`,
        })
      }
    }

    // 3. Phone match (normalized digits)
    const extractedPhone = normalizePhone(info.phone) || normalizePhone(info.primaryContactPhone)
    const clientPhone = normalizePhone(client.primaryContactPhone)
    if (extractedPhone && clientPhone && extractedPhone.length >= 7) {
      // Compare last 10 digits (handles country code differences)
      const ep = extractedPhone.slice(-10)
      const vp = clientPhone.slice(-10)
      if (ep === vp) {
        matchPoints.push({
          field: 'phone',
          score: 1.0,
          detail: `Phone match: ${info.phone || info.primaryContactPhone}`,
        })
      }
    }

    // 4. Address match
    const extractedAddr = normalizeAddress(info.address)
    if (extractedAddr && client.country) {
      // Build client address from available fields
      const clientAddr = normalize([client.stateProvince, client.country].filter(Boolean).join(' '))
      if (clientAddr) {
        const addrScore = compareTwoStrings(extractedAddr, clientAddr)
        if (addrScore >= FUZZY_THRESHOLD) {
          matchPoints.push({
            field: 'address',
            score: addrScore,
            detail: `Address similarity (${(addrScore * 100).toFixed(0)}%)`,
          })
        }
      }
    }

    // 5. Contact person match
    if (info.primaryContactName && client.primaryContactName) {
      const contactScore = compareTwoStrings(
        normalize(info.primaryContactName),
        normalize(client.primaryContactName)
      )
      if (contactScore >= FUZZY_THRESHOLD) {
        matchPoints.push({
          field: 'primaryContactName',
          score: contactScore,
          detail: `Contact match: "${info.primaryContactName}" ↔ "${client.primaryContactName}"`,
        })
      }
    }

    // Classify match
    if (matchPoints.length === 0) continue

    const hasStrongMatch = matchPoints.some(p => p.field === 'dunsNumber' && p.score === 1.0)
    const fuzzyCount = matchPoints.filter(p => p.field !== 'dunsNumber').length

    if (hasStrongMatch || fuzzyCount >= 2) {
      const overallConfidence = hasStrongMatch
        ? Math.max(...matchPoints.map(p => p.score))
        : matchPoints.reduce((sum, p) => sum + p.score, 0) / matchPoints.length

      results.push({
        client: {
          id: client.id,
          name: client.name,
          legalName: client.legalName,
          dunsNumber: client.dunsNumber,
          website: client.website,
          industry: client.industry,
          country: client.country,
          stateProvince: client.stateProvince,
          primaryContactName: client.primaryContactName,
          primaryContactEmail: client.primaryContactEmail,
          primaryContactPhone: client.primaryContactPhone,
          status: client.status,
          documents: client.documents,
        },
        matchType: hasStrongMatch ? 'strong' : 'fuzzy',
        matchPoints,
        overallConfidence,
      })
    }
  }

  // Sort by confidence descending
  return results.sort((a, b) => b.overallConfidence - a.overallConfidence)
}
