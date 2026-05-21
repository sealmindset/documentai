'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  BookUser,
  Building2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface ContactPhone {
  id?: string
  phone: string
  type: string
  isPrimary: boolean
}

interface ContactEmail {
  id?: string
  email: string
  type: string
  isPrimary: boolean
}

interface CaseLink {
  id: string
  role: string
  vendor: {
    id: string
    name: string
    status: string
    industry: string | null
    dunsNumber: string | null
  }
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  organization: string | null
  title: string | null
  streetAddress: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  notes: string | null
  phones: ContactPhone[]
  emails: ContactEmail[]
  caseContacts?: CaseLink[]
  _count?: { caseContacts: number }
}

const CONTACT_ROLES = [
  'OPPOSING_COUNSEL', 'PROSECUTOR', 'CO_COUNSEL', 'WITNESS', 'EXPERT_WITNESS',
  'JUDGE', 'COURT_CLERK', 'CLIENT', 'GUARDIAN_AD_LITEM', 'MEDIATOR', 'INSURANCE_ADJUSTER',
]

const PHONE_TYPES = ['BUSINESS', 'HOME', 'CELLULAR', 'FAX', 'COURT']
const EMAIL_TYPES = ['BUSINESS', 'PERSONAL', 'COURT']

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    PROSECUTOR: 'critical', OPPOSING_COUNSEL: 'high', JUDGE: 'info',
    CO_COUNSEL: 'low', WITNESS: 'medium', EXPERT_WITNESS: 'medium',
    GUARDIAN_AD_LITEM: 'info', CLIENT: 'low',
  }
  return map[role] || 'outline'
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    NEW: 'info', ACCEPTED: 'medium', ASSIGNED: 'high', ACTIVE: 'low', CLOSED: 'secondary',
  }
  return map[status] || 'outline'
}

const emptyForm = {
  firstName: '', lastName: '', organization: '', title: '',
  streetAddress: '', city: '', state: '', zipCode: '', notes: '',
  phones: [{ phone: '', type: 'BUSINESS', isPrimary: true }] as ContactPhone[],
  emails: [{ email: '', type: 'BUSINESS', isPrimary: true }] as ContactEmail[],
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Contact | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts')
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts || [])
      }
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const fetchDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/contacts/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelected(data)
      }
    } catch {}
    finally { setDetailLoading(false) }
  }

  const openDetail = (contact: Contact) => {
    fetchDetail(contact.id)
    setEditing(false)
  }

  const openCreate = () => {
    setForm({ ...emptyForm, phones: [{ phone: '', type: 'BUSINESS', isPrimary: true }], emails: [{ email: '', type: 'BUSINESS', isPrimary: true }] })
    setCreating(true)
  }

  const openEdit = () => {
    if (!selected) return
    setForm({
      firstName: selected.firstName,
      lastName: selected.lastName,
      organization: selected.organization || '',
      title: selected.title || '',
      streetAddress: selected.streetAddress || '',
      city: selected.city || '',
      state: selected.state || '',
      zipCode: selected.zipCode || '',
      notes: selected.notes || '',
      phones: selected.phones.length > 0
        ? selected.phones.map((p) => ({ phone: p.phone, type: p.type, isPrimary: p.isPrimary }))
        : [{ phone: '', type: 'BUSINESS', isPrimary: true }],
      emails: selected.emails.length > 0
        ? selected.emails.map((e) => ({ email: e.email, type: e.type, isPrimary: e.isPrimary }))
        : [{ email: '', type: 'BUSINESS', isPrimary: true }],
    })
    setEditing(true)
  }

  const saveContact = async () => {
    setSaving(true)
    try {
      const body = {
        ...form,
        phones: form.phones.filter((p) => p.phone.trim()),
        emails: form.emails.filter((e) => e.email.trim()),
      }
      const url = editing && selected ? `/api/contacts/${selected.id}` : '/api/contacts'
      const method = editing && selected ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editing && selected) {
          setSelected({ ...selected, ...saved })
          setEditing(false)
        } else {
          setCreating(false)
        }
        fetchContacts()
      }
    } catch {}
    finally { setSaving(false) }
  }

  const deleteContact = async () => {
    if (!selected || !confirm('Delete this contact? This will remove them from all linked cases.')) return
    try {
      await fetch(`/api/contacts/${selected.id}`, { method: 'DELETE' })
      setSelected(null)
      fetchContacts()
    } catch {}
  }

  const addPhone = () => setForm((f) => ({ ...f, phones: [...f.phones, { phone: '', type: 'BUSINESS', isPrimary: false }] }))
  const removePhone = (i: number) => setForm((f) => ({ ...f, phones: f.phones.filter((_, j) => j !== i) }))
  const updatePhone = (i: number, field: string, value: any) => setForm((f) => ({
    ...f,
    phones: f.phones.map((p, j) => j === i ? { ...p, [field]: value } : field === 'isPrimary' && value ? { ...p, isPrimary: false } : p),
  }))

  const addEmail = () => setForm((f) => ({ ...f, emails: [...f.emails, { email: '', type: 'BUSINESS', isPrimary: false }] }))
  const removeEmail = (i: number) => setForm((f) => ({ ...f, emails: f.emails.filter((_, j) => j !== i) }))
  const updateEmail = (i: number, field: string, value: any) => setForm((f) => ({
    ...f,
    emails: f.emails.map((e, j) => j === i ? { ...e, [field]: value } : field === 'isPrimary' && value ? { ...e, isPrimary: false } : e),
  }))

  const columns: Column<Contact>[] = [
    {
      key: 'lastName', header: 'Name', sortable: true,
      filterValue: (row) => `${row.firstName} ${row.lastName}`,
      render: (row) => <span className="font-medium">{row.lastName}, {row.firstName}</span>,
    },
    {
      key: 'organization', header: 'Organization / Firm', sortable: true, filterable: true,
      render: (row) => row.organization || <span className="text-gray-400">—</span>,
    },
    {
      key: 'title', header: 'Title', sortable: true, filterable: true,
      render: (row) => row.title || <span className="text-gray-400">—</span>,
    },
    {
      key: 'primaryPhone', header: 'Phone', searchable: false,
      render: (row) => {
        const p = row.phones.find((ph) => ph.isPrimary) || row.phones[0]
        return p ? <span className="text-sm">{p.phone}</span> : <span className="text-gray-400">—</span>
      },
    },
    {
      key: 'primaryEmail', header: 'Email', searchable: false,
      render: (row) => {
        const e = row.emails.find((em) => em.isPrimary) || row.emails[0]
        return e ? <span className="text-sm">{e.email}</span> : <span className="text-gray-400">—</span>
      },
    },
    {
      key: 'caseCount', header: 'Cases', sortable: true, className: 'text-center',
      filterValue: (row) => String(row._count?.caseContacts || 0),
      render: (row) => <Badge variant="outline">{row._count?.caseContacts || 0}</Badge>,
    },
  ]

  const contactForm = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">First Name *</label>
          <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Last Name *</label>
          <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Organization / Firm</label>
          <Input value={form.organization} onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Title</label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Street Address</label>
        <Input value={form.streetAddress} onChange={(e) => setForm((f) => ({ ...f, streetAddress: e.target.value }))} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">City</label>
          <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">State</label>
          <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">ZIP</label>
          <Input value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} />
        </div>
      </div>

      {/* Phones */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone Numbers</label>
          <Button type="button" variant="ghost" size="sm" onClick={addPhone}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </div>
        {form.phones.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={p.phone} placeholder="(612) 555-0100" className="flex-1"
              onChange={(e) => updatePhone(i, 'phone', e.target.value)} />
            <select value={p.type} onChange={(e) => updatePhone(i, 'type', e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {PHONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
              <input type="radio" name={`phone-primary-${editing ? 'edit' : 'create'}`} checked={p.isPrimary}
                onChange={() => updatePhone(i, 'isPrimary', true)} /> Primary
            </label>
            {form.phones.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removePhone(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Emails */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email Addresses</label>
          <Button type="button" variant="ghost" size="sm" onClick={addEmail}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </div>
        {form.emails.map((e, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={e.email} placeholder="name@example.com" className="flex-1" type="email"
              onChange={(ev) => updateEmail(i, 'email', ev.target.value)} />
            <select value={e.type} onChange={(ev) => updateEmail(i, 'type', ev.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {EMAIL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
              <input type="radio" name={`email-primary-${editing ? 'edit' : 'create'}`} checked={e.isPrimary}
                onChange={() => updateEmail(i, 'isPrimary', true)} /> Primary
            </label>
            {form.emails.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEmail(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Notes</label>
        <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500">Manage opposing counsel, witnesses, judges, and other case contacts</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Contact
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={contacts}
            loading={loading}
            searchPlaceholder="Search contacts..."
            onRowClick={openDetail}
          />
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selected && !editing} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selected.firstName} {selected.lastName}
                </DialogTitle>
                <DialogDescription>
                  {selected.title && <span>{selected.title}</span>}
                  {selected.title && selected.organization && <span> at </span>}
                  {selected.organization && <span className="font-medium">{selected.organization}</span>}
                  {!selected.title && !selected.organization && 'Contact details'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Address */}
                {(selected.streetAddress || selected.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      {selected.streetAddress && <div>{selected.streetAddress}</div>}
                      <div>
                        {[selected.city, selected.state].filter(Boolean).join(', ')}
                        {selected.zipCode && ` ${selected.zipCode}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Phones */}
                {selected.phones.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      {selected.phones.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span>{p.phone}</span>
                          <Badge variant="outline" className="text-xs">{p.type}</Badge>
                          {p.isPrimary && <Badge variant="info" className="text-xs">Primary</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emails */}
                {selected.emails.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      {selected.emails.map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span>{e.email}</span>
                          <Badge variant="outline" className="text-xs">{e.type}</Badge>
                          {e.isPrimary && <Badge variant="info" className="text-xs">Primary</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selected.notes && (
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {selected.notes}
                  </div>
                )}

                {/* Linked Cases */}
                {selected.caseContacts && selected.caseContacts.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                      <Building2 className="h-4 w-4" /> Linked Cases ({selected.caseContacts.length})
                    </h4>
                    <div className="space-y-2">
                      {selected.caseContacts.map((cc) => (
                        <Link
                          key={cc.id}
                          href={`/parties/${cc.vendor.id}`}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={() => setSelected(null)}
                        >
                          <div>
                            <span className="text-sm font-medium">{cc.vendor.name}</span>
                            {cc.vendor.dunsNumber && (
                              <span className="text-xs text-gray-500 ml-2 font-mono">{cc.vendor.dunsNumber}</span>
                            )}
                            {cc.vendor.industry && (
                              <div className="text-xs text-gray-500">{cc.vendor.industry}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={roleBadge(cc.role) as any} className="text-xs">{roleLabel(cc.role)}</Badge>
                            <Badge variant={statusBadge(cc.vendor.status) as any} className="text-xs">{cc.vendor.status}</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2 sm:justify-between">
                <Button variant="destructive" size="sm" onClick={deleteContact}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                  <Button onClick={openEdit}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editing} onOpenChange={(open) => { if (!open) setEditing(false) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information</DialogDescription>
          </DialogHeader>
          {contactForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={saveContact} disabled={saving || !form.firstName || !form.lastName}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={creating} onOpenChange={(open) => { if (!open) setCreating(false) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>Create a contact that can be linked to one or more cases</DialogDescription>
          </DialogHeader>
          {contactForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={saveContact} disabled={saving || !form.firstName || !form.lastName}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
