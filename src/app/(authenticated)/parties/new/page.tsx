'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Building2, Gavel, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewVendorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    dunsNumber: '',
    website: '',
    industry: '',
    country: '',
    stateProvince: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    businessOwner: '',
    itOwner: '',
    annualSpend: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          annualSpend: formData.annualSpend
            ? parseFloat(formData.annualSpend)
            : undefined,
        }),
      })

      if (res.ok) {
        const vendor = await res.json()
        router.push(`/parties/${vendor.id}`)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create party')
      }
    } catch (error) {
      console.error('Error creating vendor:', error)
      alert('Failed to create party')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/parties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Party</h1>
          <p className="text-gray-500">
            Register a new party for document review
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Case Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Case Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Case Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., State v. Smith or Smith v. Jones"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Case Number</label>
                <Input
                  name="dunsNumber"
                  value={formData.dunsNumber}
                  onChange={handleChange}
                  placeholder="e.g., 27-CR-26-1234"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client / Defendant</label>
                <Input
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleChange}
                  placeholder="Full legal name of person represented"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Case Type</label>
                <Input
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="e.g., Criminal — DUI, Civil — Personal Injury"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Courthouse / Jurisdiction</label>
                <Input
                  name="stateProvince"
                  value={formData.stateProvince}
                  onChange={handleChange}
                  placeholder="e.g., Hennepin County — 4th Judicial District Court"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="United States"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated Fees ($)</label>
              <Input
                name="annualSpend"
                value={formData.annualSpend}
                onChange={handleChange}
                placeholder="25000"
                type="number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Opposing Counsel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Opposing Counsel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Attorney / Prosecutor Name</label>
                <Input
                  name="primaryContactName"
                  value={formData.primaryContactName}
                  onChange={handleChange}
                  placeholder="e.g., ADA Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Firm / Office</label>
                <Input
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="e.g., Hennepin County Attorney's Office"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  name="primaryContactEmail"
                  value={formData.primaryContactEmail}
                  onChange={handleChange}
                  placeholder="opposing@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  name="primaryContactPhone"
                  value={formData.primaryContactPhone}
                  onChange={handleChange}
                  placeholder="(612) 555-0100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Internal Owners */}
        <Card>
          <CardHeader>
            <CardTitle>Case Team Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Lead Attorney</label>
                <Input
                  name="businessOwner"
                  value={formData.businessOwner}
                  onChange={handleChange}
                  placeholder="Attorney name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Associate/Paralegal</label>
                <Input
                  name="itOwner"
                  value={formData.itOwner}
                  onChange={handleChange}
                  placeholder="Associate or paralegal name"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/parties">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Party
          </Button>
        </div>
      </form>
    </div>
  )
}
