import { prisma } from '@/lib/prisma'
import { compareTwoStrings } from 'string-similarity'

export interface ExtractedVendorInfo {
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
  vendor: {
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
function normalizeAddress(addr: ExtractedVendorInfo['address']): string {
  if (!addr) return ''
  const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country]
    .filter(Boolean)
    .map(s => normalize(s))
  return parts.join(' ')
}

const FUZZY_THRESHOLD = 0.7

/**
 * Find potential vendor matches using multi-point deduplication.
 *
 * Strong match: Exact DUNS number match
 * Fuzzy match: 2+ weak matches with score > 0.7 on name/phone/address/contacts
 */
export async function findVendorMatches(info: ExtractedVendorInfo): Promise<DedupMatch[]> {
  const results: DedupMatch[] = []

  // Fetch all active/pending vendors with their documents
  const vendors = await prisma.vendor.findMany({
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

  for (const vendor of vendors) {
    const matchPoints: MatchPoint[] = []

    // 1. DUNS exact match (strong)
    if (info.dunsNumber && vendor.dunsNumber) {
      const extractedDuns = info.dunsNumber.trim()
      const vendorDuns = vendor.dunsNumber.trim()
      if (extractedDuns === vendorDuns) {
        matchPoints.push({
          field: 'dunsNumber',
          score: 1.0,
          detail: `Exact DUNS match: ${vendorDuns}`,
        })
      }
    }

    // 2. Name fuzzy match
    if (info.name) {
      const nameScores: number[] = []
      if (vendor.name) {
        nameScores.push(compareTwoStrings(normalize(info.name), normalize(vendor.name)))
      }
      if (vendor.legalName) {
        nameScores.push(compareTwoStrings(normalize(info.name), normalize(vendor.legalName)))
      }
      if (info.legalName) {
        if (vendor.name) {
          nameScores.push(compareTwoStrings(normalize(info.legalName), normalize(vendor.name)))
        }
        if (vendor.legalName) {
          nameScores.push(compareTwoStrings(normalize(info.legalName), normalize(vendor.legalName)))
        }
      }
      const bestNameScore = Math.max(0, ...nameScores)
      if (bestNameScore >= FUZZY_THRESHOLD) {
        matchPoints.push({
          field: 'name',
          score: bestNameScore,
          detail: `Name similarity: "${info.name}" ↔ "${vendor.name}"${vendor.legalName ? ` / "${vendor.legalName}"` : ''}`,
        })
      }
    }

    // 3. Phone match (normalized digits)
    const extractedPhone = normalizePhone(info.phone) || normalizePhone(info.primaryContactPhone)
    const vendorPhone = normalizePhone(vendor.primaryContactPhone)
    if (extractedPhone && vendorPhone && extractedPhone.length >= 7) {
      // Compare last 10 digits (handles country code differences)
      const ep = extractedPhone.slice(-10)
      const vp = vendorPhone.slice(-10)
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
    if (extractedAddr && vendor.country) {
      // Build vendor address from available fields
      const vendorAddr = normalize([vendor.stateProvince, vendor.country].filter(Boolean).join(' '))
      if (vendorAddr) {
        const addrScore = compareTwoStrings(extractedAddr, vendorAddr)
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
    if (info.primaryContactName && vendor.primaryContactName) {
      const contactScore = compareTwoStrings(
        normalize(info.primaryContactName),
        normalize(vendor.primaryContactName)
      )
      if (contactScore >= FUZZY_THRESHOLD) {
        matchPoints.push({
          field: 'primaryContactName',
          score: contactScore,
          detail: `Contact match: "${info.primaryContactName}" ↔ "${vendor.primaryContactName}"`,
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
        vendor: {
          id: vendor.id,
          name: vendor.name,
          legalName: vendor.legalName,
          dunsNumber: vendor.dunsNumber,
          website: vendor.website,
          industry: vendor.industry,
          country: vendor.country,
          stateProvince: vendor.stateProvince,
          primaryContactName: vendor.primaryContactName,
          primaryContactEmail: vendor.primaryContactEmail,
          primaryContactPhone: vendor.primaryContactPhone,
          status: vendor.status,
          documents: vendor.documents,
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
