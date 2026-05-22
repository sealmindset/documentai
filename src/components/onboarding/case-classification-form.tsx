'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Scale,
  Database,
  Link2,
} from 'lucide-react'

export interface CaseClassificationData {
  businessCriticality: 'STANDARD' | 'IMPORTANT' | 'CRITICAL'
  hasPiiAccess: boolean
  hasPhiAccess: boolean
  hasPciAccess: boolean
  dataTypesAccessed: string[]
  systemIntegrations: string[]
}

interface CaseClassificationFormProps {
  data: CaseClassificationData
  onChange: <K extends keyof CaseClassificationData>(field: K, value: CaseClassificationData[K]) => void
  disabled?: boolean
}

const CRITICALITY_OPTIONS: { value: CaseClassificationData['businessCriticality']; label: string; description: string; color: string }[] = [
  { value: 'STANDARD', label: 'Standard', description: 'Routine matter with no elevated sensitivity', color: 'border-gray-300 bg-gray-50 hover:border-gray-400' },
  { value: 'IMPORTANT', label: 'Important', description: 'Significant case requiring close attention and timely action', color: 'border-yellow-300 bg-yellow-50 hover:border-yellow-400' },
  { value: 'CRITICAL', label: 'Critical', description: 'High-stakes matter with urgent deadlines or severe consequences', color: 'border-red-300 bg-red-50 hover:border-red-400' },
]

const SELECTED_CRITICALITY_STYLES: Record<string, string> = {
  STANDARD: 'border-gray-500 bg-gray-100 ring-2 ring-gray-300',
  IMPORTANT: 'border-yellow-500 bg-yellow-100 ring-2 ring-yellow-300',
  CRITICAL: 'border-red-500 bg-red-100 ring-2 ring-red-300',
}

const DATA_TYPES = [
  'Legal Documents',
  'Financial Records',
  'Medical Records',
  'Criminal Records',
  'Witness Statements',
  'Police Reports',
  'Court Filings',
  'Discovery Materials',
  'Contracts',
  'Communication Records',
]

const INTEGRATIONS = [
  'SharePoint / OneDrive',
  'Court E-Filing System',
  'Westlaw / LexisNexis',
  'Email (Microsoft 365)',
  'Case Management System',
  'Accounting Software',
]

function ToggleChip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        active
          ? 'bg-blue-100 border-blue-400 text-blue-800 font-medium'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {label}
    </button>
  )
}

export function CaseClassificationForm({ data, onChange, disabled }: CaseClassificationFormProps) {
  const toggleDataType = (dt: string) => {
    const current = data.dataTypesAccessed
    onChange(
      'dataTypesAccessed',
      current.includes(dt) ? current.filter((d) => d !== dt) : [...current, dt]
    )
  }

  const toggleIntegration = (int: string) => {
    const current = data.systemIntegrations
    onChange(
      'systemIntegrations',
      current.includes(int) ? current.filter((i) => i !== int) : [...current, int]
    )
  }

  return (
    <div className="space-y-4">
      {/* Business Criticality */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Case Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">
            How critical is this case? This determines review frequency and agent priority.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {CRITICALITY_OPTIONS.map((opt) => {
              const selected = data.businessCriticality === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !disabled && onChange('businessCriticality', opt.value)}
                  disabled={disabled}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selected ? SELECTED_CRITICALITY_STYLES[opt.value] : opt.color
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-600 mt-1">{opt.description}</p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Sensitivity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Data Sensitivity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">
            Does this case involve any of the following sensitive data types?
          </p>
          <div className="flex gap-3">
            {([
              { key: 'hasPiiAccess' as const, label: 'PII', desc: 'Personally Identifiable Information (SSN, DOB, address)' },
              { key: 'hasPhiAccess' as const, label: 'PHI', desc: 'Protected Health Information (medical records, diagnoses)' },
              { key: 'hasPciAccess' as const, label: 'PCI', desc: 'Payment Card Industry data (credit cards, bank accounts)' },
            ]).map((item) => {
              const active = data[item.key]
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => !disabled && onChange(item.key, !active)}
                  disabled={disabled}
                  className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                    active
                      ? 'border-red-400 bg-red-50 ring-2 ring-red-200'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={active ? 'high' : 'outline'}>{item.label}</Badge>
                    <span className="text-xs text-gray-400">{active ? 'Yes' : 'No'}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Types Accessed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">
            What types of data are involved in this case?
          </p>
          <div className="flex flex-wrap gap-2">
            {DATA_TYPES.map((dt) => (
              <ToggleChip
                key={dt}
                label={dt}
                active={data.dataTypesAccessed.includes(dt)}
                onClick={() => toggleDataType(dt)}
                disabled={disabled}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Integrations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            System Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">
            Which systems will this case interact with?
          </p>
          <div className="flex flex-wrap gap-2">
            {INTEGRATIONS.map((int) => (
              <ToggleChip
                key={int}
                label={int}
                active={data.systemIntegrations.includes(int)}
                onClick={() => toggleIntegration(int)}
                disabled={disabled}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
