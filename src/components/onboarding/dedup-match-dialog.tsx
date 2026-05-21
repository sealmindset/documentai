'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, CheckCircle, FileText, ArrowRight } from 'lucide-react'

interface MatchPoint {
  field: string
  score: number
  detail: string
}

interface DocumentComparison {
  existingDocName: string
  newDocName: string
  similarity: 'identical' | 'updated' | 'different'
  existingDocDate: string | null
  newDocDate: string | null
  explanation: string
}

interface MatchedClient {
  id: string
  name: string
  legalName: string | null
  dunsNumber: string | null
  website: string | null
  industry: string | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  status: string
}

export interface DedupMatchResult {
  client: MatchedClient
  matchType: 'strong' | 'fuzzy'
  matchPoints: MatchPoint[]
  overallConfidence: number
  documentComparisons: DocumentComparison[]
}

interface ExtractedInfo {
  name?: string | null
  legalName?: string | null
  dunsNumber?: string | null
  industry?: string | null
  website?: string | null
  primaryContactName?: string | null
  primaryContactEmail?: string | null
}

interface DedupMatchDialogProps {
  open: boolean
  onClose: () => void
  match: DedupMatchResult
  extractedInfo: ExtractedInfo
  onUseExisting: () => void
  onCreateNew: () => void
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    dunsNumber: 'DUNS Number',
    name: 'Company Name',
    phone: 'Phone',
    address: 'Address',
    primaryContactName: 'Contact Person',
  }
  return labels[field] || field
}

function similarityBadge(sim: DocumentComparison['similarity']) {
  switch (sim) {
    case 'identical':
      return <Badge variant="info">Identical</Badge>
    case 'updated':
      return <Badge variant="low">Updated</Badge>
    case 'different':
      return <Badge variant="secondary">Different</Badge>
  }
}

export function DedupMatchDialog({
  open,
  onClose,
  match,
  extractedInfo,
  onUseExisting,
  onCreateNew,
}: DedupMatchDialogProps) {
  const allIdentical = match.documentComparisons.length > 0 &&
    match.documentComparisons.every((dc) => dc.similarity === 'identical')
  const hasUpdated = match.documentComparisons.some((dc) => dc.similarity === 'updated')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Potential Client Match Found
          </DialogTitle>
          <DialogDescription>
            We found an existing client that may match your uploaded documents.
            Review the comparison below.
          </DialogDescription>
        </DialogHeader>

        {/* Match confidence */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <Badge variant={match.matchType === 'strong' ? 'high' : 'medium'}>
            {match.matchType === 'strong' ? 'Strong Match' : 'Likely Match'}
          </Badge>
          <span className="text-sm text-gray-600">
            {(match.overallConfidence * 100).toFixed(0)}% confidence
          </span>
        </div>

        {/* Match points */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700">Match Points:</p>
          {match.matchPoints.map((mp, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              <span className="text-gray-600">
                <span className="font-medium">{fieldLabel(mp.field)}:</span> {mp.detail}
              </span>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {(mp.score * 100).toFixed(0)}%
              </Badge>
            </div>
          ))}
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">From Documents (New)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{extractedInfo.name || '—'}</p>
              {extractedInfo.legalName && <p className="text-gray-500">{extractedInfo.legalName}</p>}
              {extractedInfo.dunsNumber && <p>DUNS: {extractedInfo.dunsNumber}</p>}
              {extractedInfo.industry && <p>{extractedInfo.industry}</p>}
              {extractedInfo.primaryContactName && <p>{extractedInfo.primaryContactName}</p>}
              {extractedInfo.primaryContactEmail && <p className="text-gray-500">{extractedInfo.primaryContactEmail}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Existing Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{match.client.name}</p>
              {match.client.legalName && <p className="text-gray-500">{match.client.legalName}</p>}
              {match.client.dunsNumber && <p>DUNS: {match.client.dunsNumber}</p>}
              {match.client.industry && <p>{match.client.industry}</p>}
              {match.client.primaryContactName && <p>{match.client.primaryContactName}</p>}
              {match.client.primaryContactEmail && <p className="text-gray-500">{match.client.primaryContactEmail}</p>}
              <Badge variant="outline" className="mt-1">{match.client.status}</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Document comparisons */}
        {match.documentComparisons.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Document Comparison:</p>
            {match.documentComparisons.map((dc, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded border text-sm">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate flex-1">{dc.existingDocName}</span>
                <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="truncate flex-1">{dc.newDocName}</span>
                {similarityBadge(dc.similarity)}
              </div>
            ))}

            {allIdentical && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
                All uploaded documents appear identical to existing ones. No new information to process.
              </div>
            )}
            {hasUpdated && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                Updated documents detected. Using the existing client will trigger a reassessment with the newer documents.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onCreateNew}>
            Ignore Match — Create New
          </Button>
          <Button onClick={onUseExisting} disabled={allIdentical}>
            {hasUpdated ? 'Use Existing — Reassess' : 'Use Existing Client'}
          </Button>
          {allIdentical && (
            <p className="text-xs text-gray-500 w-full text-right mt-1">
              Documents are identical — nothing new to assess.
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
