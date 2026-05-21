import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getRiskTierColor(tier: string): string {
  switch (tier.toUpperCase()) {
    case 'CRITICAL':
      return 'risk-critical'
    case 'HIGH':
      return 'risk-high'
    case 'MEDIUM':
      return 'risk-medium'
    case 'LOW':
      return 'risk-low'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function calculateRiskScore(factors: {
  dataAccess: string[]
  hasPii: boolean
  hasPhi: boolean
  hasPci: boolean
  businessCriticality: string
  annualSpend: number
}): { score: number; tier: string } {
  let score = 0

  // Data sensitivity scoring
  if (factors.hasPhi) score += 30
  if (factors.hasPii) score += 25
  if (factors.hasPci) score += 25

  // Business criticality scoring
  switch (factors.businessCriticality) {
    case 'MISSION_CRITICAL':
      score += 30
      break
    case 'BUSINESS_CRITICAL':
      score += 20
      break
    case 'IMPORTANT':
      score += 10
      break
    default:
      score += 5
  }

  // Annual spend scoring
  if (factors.annualSpend > 1000000) score += 15
  else if (factors.annualSpend > 500000) score += 10
  else if (factors.annualSpend > 100000) score += 5

  // Cap at 100
  score = Math.min(score, 100)

  // Determine tier
  let tier: string
  if (score >= 80) tier = 'CRITICAL'
  else if (score >= 60) tier = 'HIGH'
  else if (score >= 40) tier = 'MEDIUM'
  else tier = 'LOW'

  return { score, tier }
}
