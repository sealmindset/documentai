'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Mail,
  Send,
  Check,
  Loader2,
  Trash2,
  Plus,
  AlertCircle,
  Clock,
} from 'lucide-react'

interface OutboundEmail {
  id: string
  clientId: string
  recipientEmail: string
  recipientName: string | null
  subject: string
  body: string
  ccEmails: string | null
  attachmentIds: string | null
  status: string
  approvedBy: string | null
  approvedAt: string | null
  sentAt: string | null
  errorMessage: string | null
  triggeredBy: string | null
  createdAt: string
  client: { id: string; name: string; caseNumber: string | null }
}

interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
}

interface ClientOption {
  id: string
  name: string
  caseNumber: string | null
}

interface ContactOption {
  contactId: string
  role: string
  contact: { firstName: string; lastName: string; emails: { email: string }[] }
}

const statusColor = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'bg-gray-100 text-gray-800'
    case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800'
    case 'APPROVED': return 'bg-green-100 text-green-800'
    case 'SENDING': return 'bg-blue-100 text-blue-800'
    case 'SENT': return 'bg-blue-100 text-blue-800'
    case 'FAILED': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<OutboundEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<OutboundEmail | null>(null)
  const [approving, setApproving] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Compose state
  const [showCompose, setShowCompose] = useState(false)
  const [composing, setComposing] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [composeForm, setComposeForm] = useState({
    clientId: '',
    emailTemplateId: '',
    recipientContactId: '',
    recipientEmail: '',
    recipientName: '',
  })

  const fetchEmails = useCallback(() => {
    fetch('/api/emails')
      .then((r) => r.json())
      .then((data) => setEmails(Array.isArray(data) ? data : []))
      .catch(() => setEmails([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchEmails() }, [fetchEmails])

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.clients || []
        setClients(list)
      })
      .catch(() => setClients([]))

    fetch('/api/email-templates')
      .then((r) => r.json())
      .then((data) => setEmailTemplates(Array.isArray(data) ? data : []))
      .catch(() => setEmailTemplates([]))
  }, [])

  const loadContacts = async (clientId: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts`)
      const data = await res.json()
      setContacts(Array.isArray(data.contacts) ? data.contacts : [])
    } catch {
      setContacts([])
    }
  }

  const handleClientChange = (clientId: string) => {
    setComposeForm((f) => ({ ...f, clientId, recipientContactId: '', recipientEmail: '', recipientName: '' }))
    loadContacts(clientId)
  }

  const handleContactChange = (contactId: string) => {
    const cc = contacts.find((c) => c.contactId === contactId)
    if (cc) {
      setComposeForm((f) => ({
        ...f,
        recipientContactId: contactId,
        recipientEmail: cc.contact.emails[0]?.email || '',
        recipientName: `${cc.contact.firstName} ${cc.contact.lastName}`,
      }))
    }
  }

  const handleCompose = async () => {
    if (!composeForm.clientId || !composeForm.recipientEmail) return
    setComposing(true)
    try {
      const payload: Record<string, unknown> = {
        clientId: composeForm.clientId,
        recipientEmail: composeForm.recipientEmail,
        recipientName: composeForm.recipientName || undefined,
        triggeredBy: 'MANUAL',
      }
      if (composeForm.emailTemplateId) payload.emailTemplateId = composeForm.emailTemplateId
      if (composeForm.recipientContactId) payload.recipientContactId = composeForm.recipientContactId

      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowCompose(false)
        setComposeForm({ clientId: '', emailTemplateId: '', recipientContactId: '', recipientEmail: '', recipientName: '' })
        fetchEmails()
      }
    } catch { /* ignore */ } finally {
      setComposing(false)
    }
  }

  const handleApprove = async (id: string) => {
    setApproving(true)
    try {
      const res = await fetch(`/api/emails/${id}/approve`, { method: 'PUT' })
      if (res.ok) {
        fetchEmails()
        if (selectedEmail?.id === id) {
          setSelectedEmail({ ...selectedEmail, status: 'APPROVED' })
        }
      }
    } catch { /* ignore */ } finally {
      setApproving(false)
    }
  }

  const handleSend = async (id: string) => {
    setSending(true)
    try {
      const res = await fetch(`/api/emails/${id}/send`, { method: 'POST' })
      if (res.ok) {
        fetchEmails()
        if (selectedEmail?.id === id) {
          setSelectedEmail({ ...selectedEmail, status: 'SENT' })
        }
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send')
      }
    } catch { /* ignore */ } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setEmails((prev) => prev.filter((e) => e.id !== id))
        if (selectedEmail?.id === id) setSelectedEmail(null)
      }
    } catch { /* ignore */ } finally {
      setDeleting(null)
    }
  }

  const statusCounts: Record<string, number> = {}
  for (const e of emails) {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1
  }

  const pendingCount = (statusCounts['PENDING_APPROVAL'] || 0) + (statusCounts['DRAFT'] || 0)

  const columns: Column<OutboundEmail>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium">{row.subject}</div>
          <div className="text-sm text-gray-500">To: {row.recipientName || row.recipientEmail}</div>
        </div>
      ),
    },
    {
      key: 'client.name',
      header: 'Case',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-sm">{row.client.name}</div>
          {row.client.caseNumber && (
            <div className="text-xs text-gray-500">{row.client.caseNumber}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (row) => (
        <Badge className={statusColor(row.status)} variant="outline">
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      searchable: false,
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      }),
    },
    {
      key: 'sentAt',
      header: 'Sent',
      sortable: true,
      searchable: false,
      render: (row) => row.sentAt
        ? new Date(row.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : <span className="text-gray-400">--</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outbound Emails</h1>
          <p className="text-sm text-gray-500">Attorney-approved email outreach managed by ECHO</p>
        </div>
        <Button onClick={() => setShowCompose(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Compose Email
        </Button>
      </div>

      {pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              {pendingCount} email{pendingCount > 1 ? 's' : ''} awaiting approval
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENDING', 'SENT', 'FAILED'].map((status) => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Badge className={statusColor(status)} variant="outline">
                  {status === 'PENDING_APPROVAL' ? 'PENDING' : status}
                </Badge>
                <span className="text-2xl font-bold">{statusCounts[status] || 0}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={emails}
            loading={loading}
            searchPlaceholder="Search emails..."
            emptyIcon={<Mail className="h-12 w-12 text-gray-300 mb-3" />}
            emptyTitle="No outbound emails yet"
            emptyDescription="Use Compose to create an email for attorney approval."
            onRowClick={(row) => setSelectedEmail(row)}
          />
        </CardContent>
      </Card>

      {/* Email Detail Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge className={statusColor(selectedEmail.status)} variant="outline">
                    {selectedEmail.status.replace(/_/g, ' ')}
                  </Badge>
                  {selectedEmail.subject}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">To:</span>
                    <p className="font-medium">
                      {selectedEmail.recipientName && `${selectedEmail.recipientName} `}
                      &lt;{selectedEmail.recipientEmail}&gt;
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Case:</span>
                    <p className="font-medium">{selectedEmail.client.name}</p>
                  </div>
                  {selectedEmail.ccEmails && JSON.parse(selectedEmail.ccEmails).length > 0 && (
                    <div>
                      <span className="text-gray-500">CC:</span>
                      <p className="font-medium">{JSON.parse(selectedEmail.ccEmails).join(', ')}</p>
                    </div>
                  )}
                  {selectedEmail.approvedBy && (
                    <div>
                      <span className="text-gray-500">Approved by:</span>
                      <p className="font-medium">{selectedEmail.approvedBy}</p>
                    </div>
                  )}
                </div>

                {selectedEmail.errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <p className="text-sm text-red-700">{selectedEmail.errorMessage}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Email Body</h4>
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg border max-h-80 overflow-y-auto">
                    {selectedEmail.body}
                  </pre>
                </div>

                <div className="flex gap-2">
                  {(selectedEmail.status === 'DRAFT' || selectedEmail.status === 'PENDING_APPROVAL') && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(selectedEmail.id)}
                      disabled={approving}
                    >
                      {approving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                  )}
                  {selectedEmail.status === 'APPROVED' && (
                    <Button
                      size="sm"
                      onClick={() => handleSend(selectedEmail.id)}
                      disabled={sending}
                    >
                      {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                      Send Now
                    </Button>
                  )}
                  {selectedEmail.status === 'FAILED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await fetch(`/api/emails/${selectedEmail.id}/approve`, { method: 'PUT' })
                        fetchEmails()
                        setSelectedEmail({ ...selectedEmail, status: 'APPROVED' })
                      }}
                    >
                      Re-approve for Retry
                    </Button>
                  )}
                  {selectedEmail.status !== 'SENT' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(selectedEmail.id)}
                      disabled={deleting === selectedEmail.id}
                    >
                      {deleting === selectedEmail.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Case</label>
              <Select onValueChange={handleClientChange} value={composeForm.clientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.caseNumber ? `(${c.caseNumber})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {composeForm.clientId && (
              <div>
                <label className="text-sm font-medium text-gray-700">Email Template (optional)</label>
                <Select onValueChange={(v) => setComposeForm((f) => ({ ...f, emailTemplateId: v }))} value={composeForm.emailTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No template (freeform)" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {composeForm.clientId && contacts.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Recipient (from case contacts)</label>
                <Select onValueChange={handleContactChange} value={composeForm.recipientContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((cc) => (
                      <SelectItem key={cc.contactId} value={cc.contactId}>
                        {cc.contact.firstName} {cc.contact.lastName} ({cc.role})
                        {cc.contact.emails[0] ? ` — ${cc.contact.emails[0].email}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Recipient Email</label>
              <Input
                value={composeForm.recipientEmail}
                onChange={(e) => setComposeForm((f) => ({ ...f, recipientEmail: e.target.value }))}
                placeholder="prosecutor@example.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Recipient Name</label>
              <Input
                value={composeForm.recipientName}
                onChange={(e) => setComposeForm((f) => ({ ...f, recipientName: e.target.value }))}
                placeholder="Jane Smith"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCompose(false)}>Cancel</Button>
              <Button
                onClick={handleCompose}
                disabled={composing || !composeForm.clientId || !composeForm.recipientEmail}
              >
                {composing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                Compose with ECHO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
