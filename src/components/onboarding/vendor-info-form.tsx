'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin, Phone, Globe, User } from 'lucide-react'

export interface VendorFormData {
  name: string
  legalName: string
  dunsNumber: string
  street: string
  city: string
  state: string
  country: string
  zip: string
  phone: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
  industry: string
  website: string
}

interface VendorInfoFormProps {
  data: VendorFormData
  confidence: Record<string, number>
  onChange: (field: keyof VendorFormData, value: string) => void
  disabled?: boolean
}

function ConfidenceIndicator({ score }: { score: number }) {
  if (score >= 0.8) return null // high confidence, no indicator needed
  if (score >= 0.5) {
    return <Badge variant="medium" className="text-[10px] px-1.5 py-0">Low confidence</Badge>
  }
  return <Badge variant="high" className="text-[10px] px-1.5 py-0">Not found</Badge>
}

function FormField({
  label,
  field,
  value,
  confidence,
  onChange,
  disabled,
  type = 'text',
  required = false,
}: {
  label: string
  field: keyof VendorFormData
  value: string
  confidence: number
  onChange: (field: keyof VendorFormData, value: string) => void
  disabled?: boolean
  type?: string
  required?: boolean
}) {
  const isLowConfidence = confidence < 0.8
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        <ConfidenceIndicator score={confidence} />
      </div>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        disabled={disabled}
        className={isLowConfidence && !value ? 'border-yellow-400 bg-yellow-50' : ''}
        placeholder={isLowConfidence ? 'Could not extract — please enter manually' : ''}
      />
    </div>
  )
}

export function VendorInfoForm({ data, confidence, onChange, disabled }: VendorInfoFormProps) {
  const c = (field: string) => confidence[field] ?? 0

  return (
    <div className="space-y-4">
      {/* Company Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Company Name"
              field="name"
              value={data.name}
              confidence={c('name')}
              onChange={onChange}
              disabled={disabled}
              required
            />
            <FormField
              label="Legal Name"
              field="legalName"
              value={data.legalName}
              confidence={c('legalName')}
              onChange={onChange}
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField
              label="DUNS Number"
              field="dunsNumber"
              value={data.dunsNumber}
              confidence={c('dunsNumber')}
              onChange={onChange}
              disabled={disabled}
            />
            <FormField
              label="Industry"
              field="industry"
              value={data.industry}
              confidence={c('industry')}
              onChange={onChange}
              disabled={disabled}
            />
            <FormField
              label="Website"
              field="website"
              value={data.website}
              confidence={c('website')}
              onChange={onChange}
              disabled={disabled}
              type="url"
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FormField
              label="Street"
              field="street"
              value={data.street}
              confidence={c('address')}
              onChange={onChange}
              disabled={disabled}
            />
            <div className="grid grid-cols-4 gap-4">
              <FormField
                label="City"
                field="city"
                value={data.city}
                confidence={c('address')}
                onChange={onChange}
                disabled={disabled}
              />
              <FormField
                label="State / Province"
                field="state"
                value={data.state}
                confidence={c('address')}
                onChange={onChange}
                disabled={disabled}
              />
              <FormField
                label="ZIP / Postal"
                field="zip"
                value={data.zip}
                confidence={c('address')}
                onChange={onChange}
                disabled={disabled}
              />
              <FormField
                label="Country"
                field="country"
                value={data.country}
                confidence={c('address')}
                onChange={onChange}
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Phone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Primary Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <FormField
              label="Contact Name"
              field="primaryContactName"
              value={data.primaryContactName}
              confidence={c('primaryContactName')}
              onChange={onChange}
              disabled={disabled}
            />
            <FormField
              label="Contact Email"
              field="primaryContactEmail"
              value={data.primaryContactEmail}
              confidence={c('primaryContactEmail')}
              onChange={onChange}
              disabled={disabled}
              type="email"
            />
            <FormField
              label="Contact Phone"
              field="primaryContactPhone"
              value={data.primaryContactPhone}
              confidence={c('primaryContactPhone')}
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
