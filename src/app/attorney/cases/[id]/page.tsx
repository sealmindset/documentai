'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DocumentViewer } from '@/components/documents/document-viewer'
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Users,
  FileText,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  Download,
  ChevronRight,
  Scale,
  Gavel,
  UserCheck,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Brain,
  Search,
  Shield,
  Plus,
  UserPlus,
  Building,
} from 'lucide-react'

interface CaseDetail {
  id: string
  name: string
  legalName: string | null
  dunsNumber: string | null
  website: string | null
  industry: string | null
  stateProvince: string | null
  status: string
  businessOwner: string | null
  itOwner: string | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  primaryContactPhone: string | null
  clientProfiles: { priorityTier: string; overallReviewScore: number | null }[]
  caseReviews: { id: string; assessmentType: string; assessmentStatus: string; reviewRating: string | null; assessmentDate: string | null }[]
  documents: { id: string; documentType: string; documentName: string; status: string; uploadDate: string; fileSize: number | null; mimeType: string | null }[]
  issues: { id: string; title: string; severity: string; status: string; dueDate: string | null; findingCategory: string | null }[]
  actionItems?: { id: string; title: string; status: string; dueDate: string | null; assignedTo: string | null; priority: string }[]
}

interface CaseContact {
  id: string
  role: string
  notes: string | null
  contact: {
    id: string; firstName: string; lastName: string; organization: string | null; title: string | null
    phones: { id: string; phone: string; type: string; isPrimary: boolean }[]
    emails: { id: string; email: string; type: string; isPrimary: boolean }[]
  }
}

const TABS = ['Overview', 'Documents', 'Contacts', 'Issues', 'Tasks'] as const
type Tab = typeof TABS[number]

const ROLE_LABELS: Record<string, string> = {
  OPPOSING_COUNSEL: 'Opposing Counsel', PROSECUTOR: 'Prosecutor', CO_COUNSEL: 'Co-Counsel',
  WITNESS: 'Witness', EXPERT_WITNESS: 'Expert Witness', JUDGE: 'Judge',
  COURT_CLERK: 'Court Clerk', CLIENT: 'Client', GUARDIAN_AD_LITEM: 'Guardian ad Litem',
}

export default function CaseDetailPage() {
  const params = useParams()
  const [caseData, setCaseData] = useState<CaseDetail | null>(null)
  const [contacts, setContacts] = useState<CaseContact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [openViewers, setOpenViewers] = useState<{ id: string; documentId: string; position: { x: number; y: number } }[]>([])
  const [focusedViewer, setFocusedViewer] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadFileName, setUploadFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [showContactForm, setShowContactForm] = useState(false)
  const [contactMode, setContactMode] = useState<'new' | 'existing'>('new')
  const [contactSearch, setContactSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; firstName: string; lastName: string; organization: string | null; phones: { phone: string }[]; emails: { email: string }[] }[]>([])
  const [selectedExisting, setSelectedExisting] = useState<string | null>(null)
  const [contactSaving, setContactSaving] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState({
    firstName: '', lastName: '', organization: '', title: '',
    role: 'WITNESS', phone: '', phoneType: 'CELLULAR', email: '', emailType: 'BUSINESS', notes: '',
  })
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDocument = useCallback((documentId: string) => {
    const existing = openViewers.find((v) => v.documentId === documentId)
    if (existing) { setFocusedViewer(existing.id); return }
    const offset = openViewers.length * 30
    const id = `viewer-${Date.now()}`
    setOpenViewers((prev) => [...prev, { id, documentId, position: { x: 200 + offset, y: 80 + offset } }])
    setFocusedViewer(id)
  }, [openViewers])

  const refreshCase = useCallback(() => {
    if (!params.id) return
    fetch(`/api/clients/${params.id}`).then((r) => r.ok ? r.json() : null).then((client) => {
      if (client) setCaseData(client)
    })
  }, [params.id])

  const handleUpload = useCallback(async (file: File) => {
    if (!params.id) return
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError(`File too large. Maximum 50MB.`)
      setUploadStatus('error')
      return
    }

    setUploading(true)
    setUploadStatus('uploading')
    setUploadFileName(file.name)
    setUploadError(null)
    setUploadProgress(0)

    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 90))
    }, 200)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/attorney/cases/${params.id}/documents`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }

      const data = await res.json()
      setUploadStatus('analyzing')

      let checks = 0
      pollRef.current = setInterval(() => {
        checks++
        fetch(`/api/clients/${params.id}`).then((r) => r.ok ? r.json() : null).then((client) => {
          if (!client) return
          const doc = client.documents.find((d: { id: string; status: string }) => d.id === data.document.id)
          if (doc && doc.status !== 'ANALYZING') {
            setCaseData(client)
            setUploadStatus('done')
            setUploading(false)
            if (pollRef.current) clearInterval(pollRef.current)
            setTimeout(() => {
              setUploadStatus('idle')
              setUploadFileName(null)
            }, 4000)
          }
        })
        if (checks >= 60) {
          if (pollRef.current) clearInterval(pollRef.current)
          refreshCase()
          setUploadStatus('done')
          setUploading(false)
        }
      }, 3000)
    } catch (err) {
      clearInterval(progressInterval)
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      setUploadStatus('error')
      setUploading(false)
    }
  }, [params.id, refreshCase])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [handleUpload])

  const searchExistingContacts = useCallback((query: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!query.trim() || !params.id) { setSearchResults([]); return }
    searchTimeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/attorney/cases/${params.id}/contacts?search=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.contacts || [])
      }
    }, 300)
  }, [params.id])

  const resetContactForm = useCallback(() => {
    setShowContactForm(false)
    setContactMode('new')
    setContactSearch('')
    setSearchResults([])
    setSelectedExisting(null)
    setContactError(null)
    setContactForm({
      firstName: '', lastName: '', organization: '', title: '',
      role: 'WITNESS', phone: '', phoneType: 'CELLULAR', email: '', emailType: 'BUSINESS', notes: '',
    })
  }, [])

  const saveContact = useCallback(async () => {
    if (!params.id) return
    setContactSaving(true)
    setContactError(null)

    try {
      let body: Record<string, unknown>

      if (contactMode === 'existing' && selectedExisting) {
        body = { contactId: selectedExisting, role: contactForm.role, notes: contactForm.notes || undefined }
      } else {
        if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
          setContactError('First and last name are required')
          setContactSaving(false)
          return
        }
        body = {
          firstName: contactForm.firstName.trim(),
          lastName: contactForm.lastName.trim(),
          organization: contactForm.organization.trim() || undefined,
          title: contactForm.title.trim() || undefined,
          role: contactForm.role,
          notes: contactForm.notes.trim() || undefined,
          phones: contactForm.phone.trim() ? [{ phone: contactForm.phone.trim(), type: contactForm.phoneType, isPrimary: true }] : undefined,
          emails: contactForm.email.trim() ? [{ email: contactForm.email.trim(), type: contactForm.emailType, isPrimary: true }] : undefined,
        }
      }

      const res = await fetch(`/api/attorney/cases/${params.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save' }))
        throw new Error(err.error || 'Failed to save contact')
      }

      const newContact = await res.json()
      setContacts((prev) => [newContact, ...prev])
      resetContactForm()
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Failed to save contact')
    } finally {
      setContactSaving(false)
    }
  }, [params.id, contactMode, selectedExisting, contactForm, resetContactForm])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!params.id) return
    Promise.all([
      fetch(`/api/clients/${params.id}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/clients/${params.id}/contacts`).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([client, contactData]) => {
      setCaseData(client)
      setContacts(contactData?.contacts || [])
    }).finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="text-center py-16">
        <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Case not found</p>
        <Link href="/attorney/cases"><Button variant="outline" className="mt-4">Back to Cases</Button></Link>
      </div>
    )
  }

  const profile = caseData.clientProfiles[0]
  const openIssues = caseData.issues.filter((i) => !['CLOSED', 'RESOLVED'].includes(i.status))

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/attorney/cases" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Cases
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{caseData.name}</h1>
              {profile?.priorityTier && (
                <Badge variant={
                  profile.priorityTier === 'CRITICAL' ? 'critical' :
                  profile.priorityTier === 'HIGH' ? 'high' :
                  profile.priorityTier === 'MEDIUM' ? 'medium' : 'low'
                }>
                  {profile.priorityTier}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {caseData.dunsNumber || 'No case number'}
              {caseData.stateProvince ? ` · ${caseData.stateProvince}` : ''}
            </p>
          </div>
          {profile?.overallReviewScore != null && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-gray-900">{profile.overallReviewScore}</p>
              <p className="text-xs text-gray-500">Review Score</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map((tab) => {
          const count = tab === 'Documents' ? caseData.documents.length :
            tab === 'Issues' ? openIssues.length :
            tab === 'Contacts' ? contacts.length :
            tab === 'Tasks' ? (caseData.actionItems?.length || 0) : null
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {count != null && count > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="space-y-4">
          {/* Case Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Gavel className="h-4 w-4" /> Case Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Case Number</p>
                <p className="font-medium font-mono">{caseData.dunsNumber || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Client / Defendant</p>
                <p className="font-medium">{caseData.legalName || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Courthouse</p>
                <p className="font-medium">{caseData.stateProvince || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Case Type</p>
                <p className="font-medium">{caseData.industry || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant="outline">{caseData.status}</Badge>
              </div>
            </div>
          </div>

          {/* Case Team */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" /> Case Team
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Lead Attorney</p>
                  <p className="font-medium">{caseData.businessOwner || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Associate/Paralegal</p>
                  <p className="font-medium">{caseData.itOwner || '—'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <UserCheck className="h-4 w-4" /> Opposing Counsel
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Attorney / Prosecutor</p>
                  <p className="font-medium">{caseData.primaryContactName || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Office</p>
                  <p className="font-medium">{caseData.website || '—'}</p>
                </div>
                {caseData.primaryContactEmail && (
                  <a href={`mailto:${caseData.primaryContactEmail}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                    <Mail className="h-3.5 w-3.5" /> {caseData.primaryContactEmail}
                  </a>
                )}
                {caseData.primaryContactPhone && (
                  <a href={`tel:${caseData.primaryContactPhone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                    <Phone className="h-3.5 w-3.5" /> {caseData.primaryContactPhone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick snapshot */}
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setActiveTab('Documents')} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 transition-colors">
              <FileText className="h-5 w-5 text-blue-500 mx-auto" />
              <p className="text-2xl font-bold mt-1">{caseData.documents.length}</p>
              <p className="text-xs text-gray-500">Documents</p>
            </button>
            <button onClick={() => setActiveTab('Issues')} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 transition-colors">
              <AlertTriangle className="h-5 w-5 text-orange-500 mx-auto" />
              <p className="text-2xl font-bold mt-1">{openIssues.length}</p>
              <p className="text-xs text-gray-500">Open Issues</p>
            </button>
            <button onClick={() => setActiveTab('Contacts')} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 transition-colors">
              <Users className="h-5 w-5 text-gray-500 mx-auto" />
              <p className="text-2xl font-bold mt-1">{contacts.length}</p>
              <p className="text-xs text-gray-500">Contacts</p>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Documents' && (
        <div className="space-y-3">
          {/* Upload zone */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.tiff,.bmp"
            onChange={handleFileSelect}
          />

          {uploadStatus === 'idle' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <Upload className={`h-8 w-8 mx-auto mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="font-medium text-gray-700">
                {dragOver ? 'Drop file here' : 'Upload Document'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag & drop or tap to select · PDF, Word, images up to 50MB
              </p>
              <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-3">
                <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> AURA extracts</span>
                <span className="flex items-center gap-1"><Search className="h-3 w-3" /> DORA classifies</span>
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> ARIA identifies issues</span>
              </p>
            </div>
          )}

          {(uploadStatus === 'uploading' || uploadStatus === 'analyzing' || uploadStatus === 'done') && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  uploadStatus === 'done' ? 'bg-green-50' : 'bg-blue-50'
                }`}>
                  {uploadStatus === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{uploadFileName}</p>
                  <p className="text-sm text-gray-500">
                    {uploadStatus === 'uploading' && 'Uploading...'}
                    {uploadStatus === 'analyzing' && 'AI agents are analyzing this document...'}
                    {uploadStatus === 'done' && 'Analysis complete'}
                  </p>
                </div>
                {uploadStatus === 'done' && (
                  <button onClick={() => { setUploadStatus('idle'); setUploadFileName(null) }}>
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {uploadStatus === 'uploading' && (
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              {uploadStatus === 'analyzing' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                    <span className="text-gray-600"><strong>AURA</strong> — Extracting content & classifying document</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-3.5 w-3.5 text-purple-500 animate-spin" />
                    <span className="text-gray-600"><strong>DORA</strong> — Checking document registry</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-3.5 w-3.5 text-orange-500 animate-spin" />
                    <span className="text-gray-600"><strong>ARIA</strong> — Identifying legal issues & risk factors</span>
                  </div>
                </div>
              )}

              {uploadStatus === 'done' && (
                <p className="text-sm text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Document processed — check Issues tab for any findings
                </p>
              )}
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Upload failed</p>
                <p className="text-sm text-red-600 mt-0.5">{uploadError}</p>
              </div>
              <button onClick={() => { setUploadStatus('idle'); setUploadError(null) }}>
                <X className="h-4 w-4 text-red-400 hover:text-red-600" />
              </button>
            </div>
          )}

          {/* Document list */}
          {caseData.documents.length > 0 ? (
            caseData.documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => openDocument(doc.id)}
                className="w-full flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors text-left"
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  doc.status === 'ANALYZING' ? 'bg-yellow-50' : 'bg-blue-50'
                }`}>
                  {doc.status === 'ANALYZING' ? (
                    <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                  ) : (
                    <FileText className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.documentName}</p>
                  <p className="text-sm text-gray-500">
                    {doc.documentType.replace(/_/g, ' ')} · {new Date(doc.uploadDate).toLocaleDateString()}
                    {doc.fileSize && ` · ${(doc.fileSize / 1024).toFixed(0)} KB`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={
                    doc.status === 'ANALYZED' ? 'info' as BadgeProps['variant'] :
                    doc.status === 'ANALYZING' ? 'medium' as BadgeProps['variant'] :
                    'outline' as BadgeProps['variant']
                  }>{doc.status}</Badge>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            ))
          ) : uploadStatus === 'idle' ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Upload your first document to get started
            </div>
          ) : null}
        </div>
      )}

      {activeTab === 'Contacts' && (
        <div className="space-y-3">
          {/* Add contact button / form */}
          {!showContactForm ? (
            <button
              onClick={() => setShowContactForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 p-4 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              <span className="font-medium">Add Contact</span>
            </button>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Add Contact</h3>
                <button onClick={resetContactForm} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mode toggle */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => { setContactMode('new'); setSelectedExisting(null) }}
                  className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                    contactMode === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  New Contact
                </button>
                <button
                  onClick={() => setContactMode('existing')}
                  className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                    contactMode === 'existing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Link Existing
                </button>
              </div>

              {contactMode === 'existing' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or organization..."
                      value={contactSearch}
                      onChange={(e) => { setContactSearch(e.target.value); searchExistingContacts(e.target.value) }}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {searchResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedExisting(c.id); setContactSearch(`${c.firstName} ${c.lastName}`) ; setSearchResults([]) }}
                          className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors ${selectedExisting === c.id ? 'bg-blue-50' : ''}`}
                        >
                          <p className="font-medium text-sm text-gray-900">{c.firstName} {c.lastName}</p>
                          <p className="text-xs text-gray-500">
                            {c.organization || ''}
                            {c.phones[0] ? ` · ${c.phones[0].phone}` : ''}
                            {c.emails[0] ? ` · ${c.emails[0].email}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {contactSearch.length > 1 && searchResults.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">No matching contacts found</p>
                  )}
                  {selectedExisting && (
                    <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-blue-800">{contactSearch}</span>
                      <button onClick={() => { setSelectedExisting(null); setContactSearch('') }} className="ml-auto">
                        <X className="h-3.5 w-3.5 text-blue-400 hover:text-blue-600" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {contactMode === 'new' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={contactForm.firstName}
                        onChange={(e) => setContactForm((f) => ({ ...f, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={contactForm.lastName}
                        onChange={(e) => setContactForm((f) => ({ ...f, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Organization</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={contactForm.organization}
                          onChange={(e) => setContactForm((f) => ({ ...f, organization: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Firm / Office"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input
                        type="text"
                        value={contactForm.title}
                        onChange={(e) => setContactForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Attorney, Judge, etc."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="tel"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <select
                          value={contactForm.phoneType}
                          onChange={(e) => setContactForm((f) => ({ ...f, phoneType: e.target.value }))}
                          className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="CELLULAR">Cell</option>
                          <option value="BUSINESS">Office</option>
                          <option value="HOME">Home</option>
                          <option value="COURT">Court</option>
                          <option value="FAX">Fax</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="email"
                            value={contactForm.email}
                            onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="email@example.com"
                          />
                        </div>
                        <select
                          value={contactForm.emailType}
                          onChange={(e) => setContactForm((f) => ({ ...f, emailType: e.target.value }))}
                          className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="BUSINESS">Work</option>
                          <option value="PERSONAL">Personal</option>
                          <option value="COURT">Court</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Role selector — always shown */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role on Case *</label>
                <select
                  value={contactForm.role}
                  onChange={(e) => setContactForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CLIENT">Client</option>
                  <option value="WITNESS">Witness</option>
                  <option value="EXPERT_WITNESS">Expert Witness</option>
                  <option value="PROSECUTOR">Prosecutor</option>
                  <option value="OPPOSING_COUNSEL">Opposing Counsel</option>
                  <option value="CO_COUNSEL">Co-Counsel</option>
                  <option value="JUDGE">Judge</option>
                  <option value="COURT_CLERK">Court Clerk</option>
                  <option value="GUARDIAN_AD_LITEM">Guardian ad Litem</option>
                  <option value="MEDIATOR">Mediator</option>
                  <option value="INSURANCE_ADJUSTER">Insurance Adjuster</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Optional notes about this contact's involvement..."
                />
              </div>

              {contactError && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> {contactError}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" size="sm" onClick={resetContactForm}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={saveContact}
                  disabled={contactSaving || (contactMode === 'existing' && !selectedExisting)}
                >
                  {contactSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-1" /> Add to Case</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Contact list */}
          {contacts.length > 0 ? (
            contacts.map((cc) => {
              const primaryPhone = cc.contact.phones.find((p: { isPrimary: boolean }) => p.isPrimary) || cc.contact.phones[0]
              const primaryEmail = cc.contact.emails.find((e: { isPrimary: boolean }) => e.isPrimary) || cc.contact.emails[0]
              return (
                <div key={cc.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {cc.contact.firstName} {cc.contact.lastName}
                      </p>
                      {cc.contact.title && (
                        <p className="text-xs text-gray-400">{cc.contact.title}</p>
                      )}
                      {cc.contact.organization && (
                        <p className="text-sm text-gray-500">{cc.contact.organization}</p>
                      )}
                    </div>
                    <Badge variant={(
                      cc.role === 'JUDGE' ? 'high' :
                      cc.role === 'PROSECUTOR' || cc.role === 'OPPOSING_COUNSEL' ? 'critical' :
                      cc.role === 'CLIENT' ? 'info' : 'outline'
                    ) as BadgeProps['variant']}>
                      {ROLE_LABELS[cc.role] || cc.role}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {primaryPhone && (
                      <a href={`tel:${primaryPhone.phone}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                        <Phone className="h-3.5 w-3.5" /> {primaryPhone.phone}
                      </a>
                    )}
                    {primaryEmail && (
                      <a href={`mailto:${primaryEmail.email}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                        <Mail className="h-3.5 w-3.5" /> {primaryEmail.email}
                      </a>
                    )}
                  </div>
                  {cc.notes && (
                    <p className="text-xs text-gray-400 mt-2 italic">{cc.notes}</p>
                  )}
                </div>
              )
            })
          ) : !showContactForm ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Add your first contact to get started
            </div>
          ) : null}
        </div>
      )}

      {activeTab === 'Issues' && (
        <div className="space-y-2">
          {openIssues.length > 0 ? (
            openIssues.map((issue) => (
              <div key={issue.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{issue.title}</p>
                    {issue.findingCategory && (
                      <p className="text-sm text-gray-500 mt-0.5">{issue.findingCategory}</p>
                    )}
                  </div>
                  <Badge variant={
                    issue.severity === 'CRITICAL' ? 'critical' :
                    issue.severity === 'HIGH' ? 'high' :
                    issue.severity === 'MEDIUM' ? 'medium' : 'low'
                  }>
                    {issue.severity}
                  </Badge>
                </div>
                {issue.dueDate && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    Due {new Date(issue.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Scale className="h-10 w-10 text-green-400 mx-auto mb-2" />
              <p className="text-gray-500">No open issues</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Tasks' && (
        <div className="space-y-2">
          {(caseData.actionItems?.length || 0) > 0 ? (
            caseData.actionItems!.map((task) => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
              return (
                <div key={task.id} className={`bg-white rounded-xl border p-4 ${isOverdue ? 'border-red-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      {task.assignedTo && (
                        <p className="text-sm text-gray-500 mt-0.5">Assigned to: {task.assignedTo}</p>
                      )}
                    </div>
                    <Badge variant={task.status === 'OPEN' ? 'medium' : 'outline'}>{task.status}</Badge>
                  </div>
                  {task.dueDate && (
                    <div className={`flex items-center gap-1.5 mt-2 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      <Clock className="h-3.5 w-3.5" />
                      {isOverdue ? 'Overdue — ' : ''}Due {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No action items</p>
            </div>
          )}
        </div>
      )}

      {/* Document viewers */}
      {openViewers.map((viewer) => (
        <DocumentViewer
          key={viewer.id}
          documentId={viewer.documentId}
          initialPosition={viewer.position}
          zIndex={focusedViewer === viewer.id ? 1000 : 900}
          onFocus={() => setFocusedViewer(viewer.id)}
          onClose={() => setOpenViewers((prev) => prev.filter((v) => v.id !== viewer.id))}
        />
      ))}
    </div>
  )
}
