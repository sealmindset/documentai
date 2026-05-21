'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Upload,
  Loader2,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { FileUploadZone, type UploadedFile } from './file-upload-zone'
import { VendorInfoForm, type VendorFormData } from './vendor-info-form'
import { DedupMatchDialog, type DedupMatchResult } from './dedup-match-dialog'
import { PipelineProgress } from './pipeline-progress'

type Step =
  | 'upload'
  | 'extracting'
  | 'dedup'
  | 'dedup_review'
  | 'vendor_form'
  | 'confirming'
  | 'complete'

interface ExtractionResult {
  fileName: string
  fileSize: number
  mimeType: string
  extractedText: string
  vendorInfo: Record<string, unknown>
  confidence: Record<string, number>
  documentAnalysis: Record<string, unknown>
}

interface WorkflowStage {
  stage: string
  agent: string
  success: boolean
  summary: string
  timestamp: Date | string
}

interface OnboardingWizardProps {
  open: boolean
  onClose: () => void
  onComplete?: () => void
}

function mergeVendorInfo(extractions: ExtractionResult[]): {
  merged: Record<string, unknown>
  confidence: Record<string, number>
} {
  // Take the highest-confidence value for each field across all extractions
  const merged: Record<string, unknown> = {}
  const confidence: Record<string, number> = {}

  for (const ext of extractions) {
    const vi = ext.vendorInfo || {}
    const conf = ext.confidence || {}

    for (const [key, value] of Object.entries(vi)) {
      if (value === null || value === undefined) continue
      const currentConf = confidence[key] || 0
      const newConf = (conf[key] as number) || 0
      if (newConf > currentConf) {
        merged[key] = value
        confidence[key] = newConf
      }
    }
  }

  return { merged, confidence }
}

function vendorInfoToFormData(info: Record<string, unknown>): VendorFormData {
  const addr = (info.address as Record<string, string | null>) || {}
  return {
    name: (info.name as string) || '',
    legalName: (info.legalName as string) || '',
    dunsNumber: (info.dunsNumber as string) || '',
    street: addr.street || '',
    city: addr.city || '',
    state: addr.state || '',
    country: addr.country || '',
    zip: addr.zip || '',
    phone: (info.phone as string) || '',
    primaryContactName: (info.primaryContactName as string) || '',
    primaryContactEmail: (info.primaryContactEmail as string) || '',
    primaryContactPhone: (info.primaryContactPhone as string) || '',
    industry: (info.industry as string) || '',
    website: (info.website as string) || '',
  }
}

export function OnboardingWizard({ open, onClose, onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const { toast } = useToast()

  // State machine
  const [step, setStep] = useState<Step>('upload')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [extractions, setExtractions] = useState<ExtractionResult[]>([])
  const [vendorForm, setVendorForm] = useState<VendorFormData>({
    name: '', legalName: '', dunsNumber: '', street: '', city: '', state: '',
    country: '', zip: '', phone: '', primaryContactName: '', primaryContactEmail: '',
    primaryContactPhone: '', industry: '', website: '',
  })
  const [confidence, setConfidence] = useState<Record<string, number>>({})
  const [dedupMatches, setDedupMatches] = useState<DedupMatchResult[]>([])
  const [selectedMatch, setSelectedMatch] = useState<DedupMatchResult | null>(null)
  const [showDedupDialog, setShowDedupDialog] = useState(false)
  const [action, setAction] = useState<'create_new' | 'use_existing' | 'reassess'>('create_new')
  const [existingVendorId, setExistingVendorId] = useState<string | null>(null)
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([])
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [createdVendorId, setCreatedVendorId] = useState<string | null>(null)
  const [incompleteFields, setIncompleteFields] = useState<string[]>([])

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((f) => ({ file: f, status: 'pending' as const })),
    ])
  }, [])

  const handleFileRemove = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Step 1 → 2: Extract vendor info from all files
  const handleStartExtraction = async () => {
    if (files.length === 0) return
    setStep('extracting')
    const results: ExtractionResult[] = []

    for (let i = 0; i < files.length; i++) {
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'extracting' } : f))
      )

      try {
        const formData = new FormData()
        formData.append('file', files[i].file)
        const res = await fetch('/api/onboarding/extract', { method: 'POST', body: formData })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Extraction failed')
        }

        const data: ExtractionResult = await res.json()
        results.push(data)
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'done' } : f))
        )
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error: (err as Error).message } : f
          )
        )
      }
    }

    setExtractions(results)

    if (results.length === 0) {
      toast({ title: 'Extraction failed', description: 'Could not extract from any files.', variant: 'destructive' })
      setStep('upload')
      return
    }

    // Merge extracted vendor info
    const { merged, confidence: conf } = mergeVendorInfo(results)
    setVendorForm(vendorInfoToFormData(merged))
    setConfidence(conf)

    // Check incomplete fields
    const incomplete = []
    if (!merged.name) incomplete.push('Company Name')
    if (!merged.industry) incomplete.push('Industry')
    if (conf.name !== undefined && conf.name < 0.5) incomplete.push('Company Name (low confidence)')
    setIncompleteFields(incomplete)

    // Proceed to dedup
    setStep('dedup')
    await runDedup(merged, results)
  }

  // Step 2 → 3: Run dedup check
  const runDedup = async (mergedInfo: Record<string, unknown>, results: ExtractionResult[]) => {
    try {
      const res = await fetch('/api/onboarding/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorInfo: mergedInfo,
          documents: results.map((r) => ({
            fileName: r.fileName,
            textSnippet: r.extractedText?.slice(0, 2000) || '',
            documentDate: (r.vendorInfo?.documentDate as string) || null,
            documentType: (r.vendorInfo?.documentType as string) || null,
          })),
        }),
      })

      if (!res.ok) {
        console.error('Dedup check failed')
        setStep('vendor_form')
        return
      }

      const data = await res.json()
      setDedupMatches(data.matches || [])

      if (data.matches && data.matches.length > 0) {
        // Show dedup review
        setSelectedMatch(data.matches[0])
        setShowDedupDialog(true)
        setStep('dedup_review')
      } else {
        // No matches — go to vendor form
        setStep('vendor_form')
      }
    } catch {
      // Dedup failed, proceed to vendor form
      setStep('vendor_form')
    }
  }

  // Dedup dialog actions
  const handleUseExisting = () => {
    if (!selectedMatch) return
    const hasUpdated = selectedMatch.documentComparisons.some(
      (dc) => dc.similarity === 'updated'
    )
    setAction(hasUpdated ? 'reassess' : 'use_existing')
    setExistingVendorId(selectedMatch.vendor.id)
    setShowDedupDialog(false)
    setStep('confirming')
    handleConfirm(hasUpdated ? 'reassess' : 'use_existing', selectedMatch.vendor.id)
  }

  const handleCreateNew = () => {
    setAction('create_new')
    setExistingVendorId(null)
    setShowDedupDialog(false)
    setStep('vendor_form')
  }

  const handleDedupClose = () => {
    setShowDedupDialog(false)
    setStep('vendor_form')
  }

  // Step 4 → 5: Confirm and run pipeline
  const handleVendorFormConfirm = () => {
    if (!vendorForm.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a company name.', variant: 'destructive' })
      return
    }
    setStep('confirming')
    handleConfirm('create_new', null)
  }

  const handleConfirm = async (
    confirmAction: 'create_new' | 'use_existing' | 'reassess',
    vendorId: string | null
  ) => {
    setPipelineRunning(true)
    setWorkflowStages([])

    try {
      const body: Record<string, unknown> = {
        action: confirmAction,
        documents: extractions.map((ext) => ({
          fileName: ext.fileName,
          fileSize: ext.fileSize,
          mimeType: ext.mimeType,
          documentType: (ext.vendorInfo?.documentType as string) || (ext.documentAnalysis?.documentType as string) || 'OTHER',
          extractedText: ext.extractedText,
          analysisResult: ext.documentAnalysis,
        })),
        businessCriticality: 'STANDARD',
        dataTypesAccessed: [],
        systemIntegrations: [],
        hasPiiAccess: false,
        hasPhiAccess: false,
        hasPciAccess: false,
      }

      if (confirmAction === 'create_new') {
        body.vendorData = {
          name: vendorForm.name,
          legalName: vendorForm.legalName || undefined,
          dunsNumber: vendorForm.dunsNumber || undefined,
          website: vendorForm.website || undefined,
          industry: vendorForm.industry || undefined,
          country: vendorForm.country || undefined,
          stateProvince: vendorForm.state || undefined,
          primaryContactName: vendorForm.primaryContactName || undefined,
          primaryContactEmail: vendorForm.primaryContactEmail || undefined,
          primaryContactPhone: vendorForm.primaryContactPhone || undefined,
        }
      } else {
        body.existingVendorId = vendorId
      }

      const res = await fetch('/api/onboarding/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Confirmation failed')
      }

      const data = await res.json()
      setCreatedVendorId(data.vendor?.id || vendorId)
      setWorkflowStages(data.workflow?.stages || [])
      setPipelineRunning(false)
      setStep('complete')

      toast({
        title: confirmAction === 'create_new' ? 'Party created' : 'Review complete',
        description: `${data.documents?.length || 0} document(s) processed.`,
      })
    } catch (err) {
      setPipelineRunning(false)
      toast({
        title: 'Error',
        description: (err as Error).message,
        variant: 'destructive',
      })
      // Stay on confirming step so user can see partial results
      setStep('complete')
    }
  }

  const handleClose = () => {
    // Reset state
    setStep('upload')
    setFiles([])
    setExtractions([])
    setDedupMatches([])
    setSelectedMatch(null)
    setWorkflowStages([])
    setCreatedVendorId(null)
    onClose()
    onComplete?.()
  }

  const stepTitle: Record<Step, string> = {
    upload: 'Upload Documents',
    extracting: 'Analyzing Documents...',
    dedup: 'Checking for Duplicates...',
    dedup_review: 'Review Match',
    vendor_form: 'Review Party Information',
    confirming: 'Processing...',
    complete: 'Onboarding Complete',
  }

  return (
    <>
      <Dialog open={open && !showDedupDialog} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {stepTitle[step]}
            </DialogTitle>
            {step === 'upload' && (
              <DialogDescription>
                Upload documents (contracts, compliance reports, questionnaires, etc.) and we&apos;ll
                extract party info, check for duplicates, and start the document review.
              </DialogDescription>
            )}
            {step === 'vendor_form' && incompleteFields.length > 0 && (
              <DialogDescription className="flex items-center gap-1.5 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                Some fields could not be extracted: {incompleteFields.join(', ')}.
                Please review and complete the form.
              </DialogDescription>
            )}
          </DialogHeader>

          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <>
              <FileUploadZone
                files={files}
                onFilesAdded={handleFilesAdded}
                onFileRemove={handleFileRemove}
              />
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleStartExtraction} disabled={files.length === 0}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Analyze {files.length} Document{files.length !== 1 ? 's' : ''}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* EXTRACTING STEP */}
          {step === 'extracting' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-blue-700">Extracting party information...</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    AI is reading your documents and identifying party details.
                  </p>
                </div>
              </div>
              <FileUploadZone
                files={files}
                onFilesAdded={() => {}}
                onFileRemove={() => {}}
                disabled
              />
            </div>
          )}

          {/* DEDUP STEP (loading) */}
          {step === 'dedup' && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-700">Checking for existing parties...</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Comparing against your party database for potential matches.
                </p>
              </div>
            </div>
          )}

          {/* VENDOR FORM STEP */}
          {step === 'vendor_form' && (
            <>
              <VendorInfoForm
                data={vendorForm}
                confidence={confidence}
                onChange={(field, value) =>
                  setVendorForm((prev) => ({ ...prev, [field]: value }))
                }
              />
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleVendorFormConfirm}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Party & Start Review
                </Button>
              </DialogFooter>
            </>
          )}

          {/* CONFIRMING STEP */}
          {step === 'confirming' && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <PipelineProgress
                    stages={workflowStages}
                    running={pipelineRunning}
                  />
                </CardContent>
              </Card>
              {pipelineRunning && (
                <p className="text-sm text-gray-500 text-center">
                  This may take a minute. The AI agents are analyzing your documents...
                </p>
              )}
            </div>
          )}

          {/* COMPLETE STEP */}
          {step === 'complete' && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      Party onboarding complete!
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {extractions.length} document(s) processed. Document review pipeline finished.
                    </p>
                  </div>
                </div>

                {workflowStages.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <PipelineProgress stages={workflowStages} running={false} />
                    </CardContent>
                  </Card>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Close</Button>
                {createdVendorId && (
                  <Button onClick={() => {
                    handleClose()
                    router.push(`/parties/${createdVendorId}`)
                  }}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Party
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dedup match dialog (shown on top of the main dialog) */}
      {selectedMatch && (
        <DedupMatchDialog
          open={showDedupDialog}
          onClose={handleDedupClose}
          match={selectedMatch}
          extractedInfo={extractions.length > 0 ? mergeVendorInfo(extractions).merged : {}}
          onUseExisting={handleUseExisting}
          onCreateNew={handleCreateNew}
        />
      )}
    </>
  )
}
