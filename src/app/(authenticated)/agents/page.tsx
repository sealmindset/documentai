'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  CheckCircle2,
  Loader2,
  Shield,
  FileSearch,
  FileText,
  BarChart3,
  Wrench,
  AlertTriangle,
  Upload,
} from 'lucide-react'

const agents = [
  {
    id: 'LEXA',
    name: 'LEXA',
    fullName: 'Legal Examination & Assessment Agent',
    description:
      'Analyzes new case intake to build initial case profiles. Evaluates charge severity, evidence complexity, witness count, and media attention to calculate priority tier and review frequency.',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    capabilities: [
      'Case intake profiling',
      'Priority tier calculation',
      'Review scheduling',
      'Jurisdiction analysis',
    ],
  },
  {
    id: 'CLARA',
    name: 'CLARA',
    fullName: 'Comprehensive Legal Analysis & Review Agent',
    description:
      'Performs deep-dive analysis on Critical and High-priority cases. Evaluates evidence strength, legal merit, witness reliability, procedural compliance, and settlement/plea potential.',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    capabilities: [
      'Multi-dimensional case scoring',
      'Evidence strength assessment',
      'Legal merit analysis',
      'Strategy recommendation',
    ],
  },
  {
    id: 'DORA',
    name: 'DORA',
    fullName: 'Documentation & Outreach Retrieval Agent',
    description:
      'Requests and tracks case documents from courts, prosecutors, opposing counsel, and records custodians. Manages discovery compliance and document inventory.',
    icon: FileSearch,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    capabilities: [
      'Court records requests',
      'Discovery tracking',
      'Document inventory',
      'Deadline monitoring',
    ],
  },
  {
    id: 'ARIA',
    name: 'ARIA',
    fullName: 'Automated Review, Identification & Analysis Agent',
    description:
      'Analyzes police reports, court filings, motions, and discovery materials to identify procedural violations, evidence issues, and constitutional concerns.',
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    capabilities: [
      'Police report analysis',
      'Motion review',
      'Evidence gap identification',
      'Constitutional issue detection',
    ],
  },
  {
    id: 'RITA',
    name: 'RITA',
    fullName: 'Report Intelligence & Threat Assessment Agent',
    description:
      'Generates case status reports, partner briefings, and caseload analytics. Tracks court compliance, deadlines, and produces trend analysis across the firm\'s cases.',
    icon: BarChart3,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    capabilities: [
      'Case status reports',
      'Partner briefings',
      'Caseload analytics',
      'Deadline compliance tracking',
    ],
  },
  {
    id: 'ATLAS',
    name: 'ATLAS',
    fullName: 'Action Tracking & Legal Advisory System Agent',
    description:
      'Manages court deadlines, filing requirements, hearing preparation, and client meetings. Creates action plans, tracks progress, and escalates overdue items to appropriate attorneys.',
    icon: Wrench,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    capabilities: [
      'Court deadline tracking',
      'Filing management',
      'Hearing preparation',
      'Escalation workflows',
    ],
  },
  {
    id: 'AURA',
    name: 'AURA',
    fullName: 'Automated Upload & Recognition Agent',
    description:
      'Extracts case information from uploaded legal documents (police reports, court filings, medical records, etc.). Identifies parties, case numbers, charges, and attorneys of record.',
    icon: Upload,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    capabilities: [
      'Case info extraction from documents',
      'Document type classification',
      'Client identification',
      'Document deduplication',
    ],
  },
]

export default function AgentsPage() {
  const [runningMaintenance, setRunningMaintenance] = useState(false)

  const runMaintenance = async () => {
    setRunningMaintenance(true)
    try {
      const res = await fetch('/api/orchestrator', { method: 'PATCH' })
      if (res.ok) {
        const data = await res.json()
        alert(
          `Maintenance cycle completed:\n` +
            `- Overdue escalations: ${data.maintenance.overdueEscalations}\n` +
            `- Expiring documents: ${data.maintenance.expiringDocuments}\n` +
            `- Upcoming assessments: ${data.maintenance.upcomingAssessments}`
        )
      }
    } catch (error) {
      console.error('Maintenance error:', error)
      alert('Failed to run maintenance cycle')
    } finally {
      setRunningMaintenance(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-500">
            Manage and monitor Document AI agents
          </p>
        </div>
        <Button onClick={runMaintenance} disabled={runningMaintenance}>
          {runningMaintenance ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Run Maintenance Cycle
        </Button>
      </div>

      {/* Agent Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Workflow</CardTitle>
          <CardDescription>
            The AI agents work together in a coordinated workflow to manage legal document reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-4">
            {agents.map((agent, idx) => (
              <div key={agent.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`p-3 rounded-full ${agent.bgColor} ${agent.color}`}
                  >
                    <agent.icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-bold mt-1">{agent.name}</span>
                </div>
                {idx < agents.length - 1 && (
                  <div className="w-8 h-0.5 bg-gray-300 mx-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg ${agent.bgColor}`}>
                  <agent.icon className={`h-6 w-6 ${agent.color}`} />
                </div>
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
              <CardTitle className="flex items-center gap-2 mt-4">
                <span className={`font-bold ${agent.color}`}>{agent.name}</span>
              </CardTitle>
              <CardDescription>{agent.fullName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{agent.description}</p>

              <div>
                <h4 className="text-sm font-medium mb-2">Capabilities:</h4>
                <ul className="space-y-1">
                  {agent.capabilities.map((cap, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-600 flex items-center gap-2"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use AI Agents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Case Onboarding Workflow</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Create a new case/matter in the Clients section</li>
                <li>Run LEXA to create the initial case profile</li>
                <li>For Critical/High cases, run CLARA for detailed case analysis</li>
                <li>DORA will request required case documents</li>
                <li>Upload documents and run ARIA for analysis</li>
                <li>RITA generates case reports automatically</li>
                <li>ATLAS manages deadlines and action items</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">API Endpoints</h4>
              <ul className="space-y-1 text-sm font-mono text-gray-600">
                <li>POST /api/agents/lexa - Case intake profiling</li>
                <li>POST /api/agents/clara - Case analysis</li>
                <li>POST /api/agents/aria - Document analysis</li>
                <li>POST /api/agents/rita - Case report generation</li>
                <li>POST /api/agents/atlas - Deadlines & action items</li>
                <li>POST /api/agents/aura - Document extraction & comparison</li>
                <li>POST /api/orchestrator - Full workflow</li>
                <li>PATCH /api/orchestrator - Maintenance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
