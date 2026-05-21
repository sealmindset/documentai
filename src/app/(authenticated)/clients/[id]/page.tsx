'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  Gavel,
  MapPin,
  Shield,
  FileText,
  AlertTriangle,
  Play,
  Loader2,
  CheckCircle2,
  Users,
  UserCheck,
  BookUser,
  Phone,
  Mail,
  Plus,
  X,
} from 'lucide-react'

interface ClientDetail {
  id: string
  name: string
  legalName: string | null
  dunsNumber: string | null
  website: string | null
  industry: string | null
  country: string | null
  stateProvince: string | null
  status: string
  businessOwner: string | null
  itOwner: string | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  primaryContactPhone: string | null
  annualSpend: number | null
  clientProfiles: {
    id: string
    priorityTier: string
    overallReviewScore: number | null
    hasPiiAccess: boolean
    hasPhiAccess: boolean
    hasPciAccess: boolean
    assessmentFrequency: string | null
    nextAssessmentDate: string | null
  }[]
  caseReviews: {
    id: string
    assessmentType: string
    assessmentStatus: string
    reviewRating: string | null
    assessmentDate: string | null
  }[]
  documents: {
    id: string
    documentType: string
    documentName: string
    status: string
    uploadDate: string
  }[]
  issues: {
    id: string
    title: string
    severity: string
    status: string
    dueDate: string | null
  }[]
}

interface CaseContact {
  id: string
  role: string
  notes: string | null
  contact: {
    id: string
    firstName: string
    lastName: string
    organization: string | null
    title: string | null
    phones: { id: string; phone: string; type: string; isPrimary: boolean }[]
    emails: { id: string; email: string; type: string; isPrimary: boolean }[]
  }
}

const ROLE_LABELS: Record<string, string> = {
  OPPOSING_COUNSEL: 'Opposing Counsel',
  PROSECUTOR: 'Prosecutor',
  CO_COUNSEL: 'Co-Counsel',
  WITNESS: 'Witness',
  EXPERT_WITNESS: 'Expert Witness',
  JUDGE: 'Judge',
  COURT_CLERK: 'Court Clerk',
  CLIENT: 'Client',
  GUARDIAN_AD_LITEM: 'Guardian ad Litem',
  MEDIATOR: 'Mediator',
  INSURANCE_ADJUSTER: 'Insurance Adjuster',
}

const ROLE_BADGE_VARIANT: Record<string, string> = {
  JUDGE: 'high',
  PROSECUTOR: 'critical',
  OPPOSING_COUNSEL: 'critical',
  CLIENT: 'info',
  CO_COUNSEL: 'low',
  EXPERT_WITNESS: 'medium',
  WITNESS: 'medium',
  GUARDIAN_AD_LITEM: 'info',
  COURT_CLERK: 'secondary',
  MEDIATOR: 'low',
  INSURANCE_ADJUSTER: 'secondary',
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'NEW': return 'info'
    case 'ACCEPTED': return 'medium'
    case 'ASSIGNED': return 'high'
    case 'ACTIVE': return 'low'
    case 'CLOSED': return 'secondary'
    case 'PENDING': return 'secondary'
    case 'INACTIVE': case 'TERMINATED': return 'destructive'
    default: return 'outline'
  }
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [runningAgent, setRunningAgent] = useState<string | null>(null)
  const [caseContacts, setCaseContacts] = useState<CaseContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [expandedContact, setExpandedContact] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchClient()
      fetchContacts()
    }
  }, [params.id])

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setClient(data)
      }
    } catch (error) {
      console.error('Failed to fetch client:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}/contacts`)
      if (res.ok) {
        const data = await res.json()
        setCaseContacts(data.contacts || [])
      }
    } catch {
    } finally {
      setContactsLoading(false)
    }
  }

  const runLEXA = async () => {
    if (!client) return
    setRunningAgent('LEXA')
    try {
      const res = await fetch('/api/agents/vera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          dataTypesAccessed: ['Legal Documents'],
          systemIntegrations: [],
          hasPiiAccess: true,
          hasPhiAccess: false,
          hasPciAccess: false,
          businessCriticality: 'IMPORTANT',
        }),
      })
      if (res.ok) {
        await fetchClient()
        alert('Client profile created successfully!')
      }
    } catch (error) {
      console.error('LEXA error:', error)
      alert('Failed to run LEXA agent')
    } finally {
      setRunningAgent(null)
    }
  }

  const runCLARA = async () => {
    if (!client) return
    setRunningAgent('CLARA')
    try {
      const res = await fetch('/api/agents/cara', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          assessmentType: 'INITIAL',
        }),
      })
      if (res.ok) {
        await fetchClient()
        alert('Document review completed successfully!')
      }
    } catch (error) {
      console.error('CLARA error:', error)
      alert('Failed to run CLARA agent')
    } finally {
      setRunningAgent(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Client not found</h2>
        <Link href="/clients">
          <Button className="mt-4">Back to Clients</Button>
        </Link>
      </div>
    )
  }

  const clientProfile = client.clientProfiles[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <Badge
                variant={
                  clientProfile?.priorityTier === 'CRITICAL'
                    ? 'critical'
                    : clientProfile?.priorityTier === 'HIGH'
                    ? 'high'
                    : clientProfile?.priorityTier === 'MEDIUM'
                    ? 'medium'
                    : clientProfile?.priorityTier === 'LOW'
                    ? 'low'
                    : 'outline'
                }
              >
                {clientProfile?.priorityTier || 'Not Assessed'}
              </Badge>
            </div>
            <p className="text-gray-500">{client.industry || 'No industry specified'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!clientProfile && (
            <Button onClick={runLEXA} disabled={!!runningAgent}>
              {runningAgent === 'LEXA' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Client Profile (LEXA)
            </Button>
          )}
          {clientProfile && ['CRITICAL', 'HIGH'].includes(clientProfile.priorityTier) && (
            <Button onClick={runCLARA} disabled={!!runningAgent}>
              {runningAgent === 'CLARA' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Document Review (CLARA)
            </Button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Review Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {clientProfile?.overallReviewScore ?? '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Open Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {client.issues.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{client.documents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{client.caseReviews.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Case Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Case Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Case Number</p>
              <p className="font-medium font-mono">{client.dunsNumber || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Client / Defendant</p>
              <p className="font-medium">{client.legalName || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Courthouse / Jurisdiction
              </p>
              <p className="font-medium">{client.stateProvince || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case Team & Opposing Counsel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Case Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Lead Attorney</p>
                <p className="font-medium">{client.businessOwner || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Associate/Paralegal</p>
                <p className="font-medium">{client.itOwner || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Opposing Counsel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Attorney / Prosecutor</p>
                <p className="font-medium">{client.primaryContactName || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Firm / Office</p>
                <p className="font-medium">{client.website || '—'}</p>
              </div>
              {client.primaryContactEmail && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{client.primaryContactEmail}</p>
                </div>
              )}
              {client.primaryContactPhone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{client.primaryContactPhone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Case Contacts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookUser className="h-5 w-5" />
              Case Contacts ({caseContacts.length})
            </CardTitle>
            <Link href="/contacts">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Manage Contacts
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {contactsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : caseContacts.length > 0 ? (
            <div className="space-y-3">
              {caseContacts.map((cc) => {
                const isExpanded = expandedContact === cc.id
                const primaryPhone = cc.contact.phones.find((p) => p.isPrimary) || cc.contact.phones[0]
                const primaryEmail = cc.contact.emails.find((e) => e.isPrimary) || cc.contact.emails[0]
                return (
                  <div
                    key={cc.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedContact(isExpanded ? null : cc.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <Link
                            href="/contacts"
                            className="font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cc.contact.firstName} {cc.contact.lastName}
                          </Link>
                          {cc.contact.organization && (
                            <p className="text-sm text-gray-500">{cc.contact.organization}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={(ROLE_BADGE_VARIANT[cc.role] || 'outline') as any}>
                          {ROLE_LABELS[cc.role] || cc.role}
                        </Badge>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {cc.contact.title && (
                          <div>
                            <span className="text-gray-500">Title:</span>{' '}
                            <span className="font-medium">{cc.contact.title}</span>
                          </div>
                        )}
                        {primaryPhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            <span>{primaryPhone.phone}</span>
                            <Badge variant="outline" className="text-xs ml-1">{primaryPhone.type}</Badge>
                          </div>
                        )}
                        {primaryEmail && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span>{primaryEmail.email}</span>
                            <Badge variant="outline" className="text-xs ml-1">{primaryEmail.type}</Badge>
                          </div>
                        )}
                        {cc.contact.phones.length > 1 && (
                          <div className="col-span-2">
                            <p className="text-gray-500 mb-1">All phones:</p>
                            <div className="flex flex-wrap gap-2">
                              {cc.contact.phones.map((p) => (
                                <span key={p.id} className="text-sm">
                                  {p.phone} <Badge variant="outline" className="text-xs">{p.type}</Badge>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {cc.contact.emails.length > 1 && (
                          <div className="col-span-2">
                            <p className="text-gray-500 mb-1">All emails:</p>
                            <div className="flex flex-wrap gap-2">
                              {cc.contact.emails.map((e) => (
                                <span key={e.id} className="text-sm">
                                  {e.email} <Badge variant="outline" className="text-xs">{e.type}</Badge>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {cc.notes && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Notes:</span>{' '}
                            <span>{cc.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookUser className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No contacts linked to this case</p>
              <Link href="/contacts">
                <Button variant="outline" size="sm" className="mt-2">
                  <Plus className="h-4 w-4 mr-1" /> Add Contact
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Profile */}
      {clientProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Client Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Data Access</p>
                <div className="flex gap-2 mt-1">
                  {clientProfile.hasPiiAccess && (
                    <Badge variant="high">PII</Badge>
                  )}
                  {clientProfile.hasPhiAccess && (
                    <Badge variant="critical">PHI</Badge>
                  )}
                  {clientProfile.hasPciAccess && (
                    <Badge variant="high">PCI</Badge>
                  )}
                  {!clientProfile.hasPiiAccess &&
                    !clientProfile.hasPhiAccess &&
                    !clientProfile.hasPciAccess && (
                      <Badge variant="low">None</Badge>
                    )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Assessment Frequency</p>
                <p className="font-medium">{clientProfile.assessmentFrequency || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Assessment</p>
                <p className="font-medium">
                  {clientProfile.nextAssessmentDate
                    ? new Date(clientProfile.nextAssessmentDate).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant={getStatusBadgeVariant(client.status)}>{client.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Open Issues ({client.issues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.issues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          issue.severity === 'CRITICAL'
                            ? 'critical'
                            : issue.severity === 'HIGH'
                            ? 'high'
                            : issue.severity === 'MEDIUM'
                            ? 'medium'
                            : 'low'
                        }
                      >
                        {issue.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{issue.status}</TableCell>
                    <TableCell>
                      {issue.dueDate
                        ? new Date(issue.dueDate).toLocaleDateString()
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No open issues</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({client.documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.documentName}</TableCell>
                    <TableCell>{doc.documentType}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(doc.uploadDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No documents uploaded</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
