'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SafetyIndicator, type SafetyLevel } from './safety-indicator'
import { VariableList, extractVariables } from './variable-pill'
import { VersionTimeline } from './version-timeline'
import {
  Bot,
  Save,
  FlaskConical,
  Rocket,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

interface PromptVersion {
  id: string
  version: number
  content: string
  changeSummary: string | null
  changedBy: string | null
  createdAt: string
}

interface PromptDetail {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  agentName: string | null
  content: string
  model: string | null
  status?: string
  temperature: number | null
  maxTokens: number | null
  isActive: boolean
  updatedBy: string | null
  updatedAt: string
  versions: PromptVersion[]
}

interface TestResult {
  testPassed: boolean
  validation: {
    valid: boolean
    blocked: boolean
    blockedReasons: string[]
    warnings: string[]
  }
  adversarialTests: { input: string; passed: boolean; reason?: string }[]
}

interface PromptEditorProps {
  prompt: PromptDetail
  onSaved: () => void
}

export function PromptEditor({ prompt, onSaved }: PromptEditorProps) {
  const [content, setContent] = useState(prompt.content)
  const [changeSummary, setChangeSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const [warnings, setWarnings] = useState<string[]>([])
  const [blockedReasons, setBlockedReasons] = useState<string[]>([])
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null)

  const [activeTab, setActiveTab] = useState<'edit' | 'versions'>('edit')

  const hasChanges = content !== prompt.content
  const variables = extractVariables(content)
  const status = prompt.status || (prompt.isActive ? 'published' : 'draft')

  const safetyLevel: SafetyLevel =
    blockedReasons.length > 0 ? 'blocked' :
    warnings.length > 0 ? 'warning' :
    status === 'published' ? 'safe' : 'unknown'

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    setTestResult(null)

    const res = await fetch(`/api/admin/prompts/${prompt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, changeSummary: changeSummary || undefined, action: 'save' }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.blockedReasons) {
        setBlockedReasons(data.blockedReasons)
        setWarnings(data.warnings || [])
        setMessage({ text: 'Content blocked by safety validation', type: 'error' })
      } else {
        setMessage({ text: data.error || 'Save failed', type: 'error' })
      }
    } else {
      setBlockedReasons([])
      setWarnings(data._warnings || [])
      if (data._warnings?.length > 0) {
        setMessage({ text: 'Saved as draft with warnings. Review before publishing.', type: 'warning' })
      } else {
        setMessage({ text: 'Saved as draft', type: 'success' })
      }
    }

    setSaving(false)
  }

  async function handleTest() {
    setTesting(true)
    setMessage(null)

    const res = await fetch(`/api/admin/prompts/${prompt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, action: 'test' }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.blockedReasons) {
        setBlockedReasons(data.blockedReasons)
        setMessage({ text: 'Content blocked by safety validation', type: 'error' })
      } else {
        setMessage({ text: data.error || 'Test failed', type: 'error' })
      }
    } else {
      setTestResult(data)
      if (data.testPassed) {
        setMessage({ text: 'All tests passed! Ready to publish.', type: 'success' })
      } else {
        setMessage({ text: 'Some tests failed. Review results below.', type: 'warning' })
      }
    }

    setTesting(false)
  }

  async function handlePublish() {
    setPublishing(true)
    setMessage(null)

    const res = await fetch(`/api/admin/prompts/${prompt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish' }),
    })

    const data = await res.json()

    if (!res.ok) {
      setMessage({ text: data.error || 'Publish failed', type: 'error' })
    } else {
      setMessage({ text: 'Published! Prompt is now live.', type: 'success' })
      onSaved()
    }

    setPublishing(false)
  }

  function handleRestore(restoredContent: string) {
    setContent(restoredContent)
    setActiveTab('edit')
    setMessage({ text: 'Content restored from version. Save to apply.', type: 'warning' })
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-center gap-2 flex-wrap">
        {prompt.agentName && (
          <Badge variant="outline" className="gap-1">
            <Bot className="h-3 w-3" />
            {prompt.agentName}
          </Badge>
        )}
        <Badge variant="outline">{prompt.category}</Badge>
        <span className="text-xs text-muted-foreground font-mono">{prompt.slug}</span>
        <SafetyIndicator
          level={safetyLevel}
          warnings={warnings}
          blockedReasons={blockedReasons}
        />
      </div>

      {prompt.description && (
        <p className="text-sm text-muted-foreground">{prompt.description}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'edit'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('edit')}
        >
          Editor
        </button>
        <button
          className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'versions'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('versions')}
        >
          Versions ({prompt.versions.length})
        </button>
      </div>

      {activeTab === 'edit' && (
        <>
          {/* Editor */}
          <div>
            <textarea
              className="w-full p-3 rounded-md border bg-background font-mono text-sm min-h-[350px] resize-y focus:ring-2 focus:ring-ring focus:ring-offset-1"
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                setBlockedReasons([])
                setTestResult(null)
              }}
            />
          </div>

          {/* Variables */}
          {variables.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Template variables ({variables.length})
              </p>
              <VariableList variables={variables} />
            </div>
          )}

          {/* Change summary */}
          <div>
            <Input
              placeholder="What did you change and why? (optional)"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>{content.length} characters</span>
              {hasChanges && <span className="text-yellow-600 font-medium">Unsaved changes</span>}
            </div>
            <div className="flex items-center gap-2">
              {/* Workflow: Save → Test → Publish */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setContent(prompt.content); setBlockedReasons([]); setWarnings([]); setTestResult(null); setMessage(null) }}
                disabled={!hasChanges}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
              <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || !hasChanges}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || hasChanges}>
                <FlaskConical className="h-3.5 w-3.5 mr-1" />
                {testing ? 'Testing...' : 'Test'}
              </Button>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishing || hasChanges || status !== 'testing'}
              >
                <Rocket className="h-3.5 w-3.5 mr-1" />
                {publishing ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`flex items-start gap-2 text-sm p-3 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' :
              message.type === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200' :
              'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
            }`}>
              {message.type === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
              {message.type === 'error' && <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              {message.type === 'warning' && <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Test results */}
          {testResult && (
            <div className="border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium">
                Test Results {testResult.testPassed ? '(All Passed)' : '(Issues Found)'}
              </p>
              <div className="space-y-1">
                {testResult.adversarialTests.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {t.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <span className="font-mono text-muted-foreground truncate">{t.input}</span>
                    {t.reason && <span className="text-red-600 shrink-0">— {t.reason}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'versions' && (
        <VersionTimeline
          versions={prompt.versions}
          currentContent={content}
          onRestore={handleRestore}
        />
      )}
    </div>
  )
}
