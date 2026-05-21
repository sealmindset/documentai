'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react'

interface Stage {
  stage: string
  agent: string
  success: boolean
  summary: string
  timestamp: Date | string
}

interface PipelineProgressProps {
  stages: Stage[]
  running: boolean
  currentAgent?: string
}

const agentDescriptions: Record<string, string> = {
  LEXA: 'Client Profiling',
  CLARA: 'Document Review',
  DORA: 'Document Collection',
  ARIA: 'Document Analysis',
  RITA: 'Report Generation',
  ATLAS: 'Action Planning',
}

const PIPELINE_AGENTS = ['LEXA', 'CLARA', 'DORA', 'ARIA', 'RITA', 'ATLAS']

function getStageStatus(agent: string, stages: Stage[], running: boolean, currentAgent?: string) {
  const stage = stages.find((s) => s.agent === agent)
  if (stage) return stage.success ? 'success' : 'failed'
  if (running && currentAgent === agent) return 'running'
  if (running) {
    // If we're running and this agent hasn't been reached yet
    const completedAgents = stages.map((s) => s.agent)
    const myIndex = PIPELINE_AGENTS.indexOf(agent)
    const lastCompletedIndex = Math.max(
      -1,
      ...completedAgents.map((a) => PIPELINE_AGENTS.indexOf(a))
    )
    if (myIndex === lastCompletedIndex + 1) return 'running'
    if (myIndex > lastCompletedIndex) return 'pending'
  }
  return 'pending'
}

export function PipelineProgress({ stages, running, currentAgent }: PipelineProgressProps) {
  // Only show agents that are relevant to the current workflow
  const relevantAgents = running
    ? PIPELINE_AGENTS
    : PIPELINE_AGENTS.filter((a) => stages.some((s) => s.agent === a))

  if (relevantAgents.length === 0 && !running) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-gray-700">Review Pipeline</h3>
        {running && (
          <Badge variant="info" className="text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {(relevantAgents.length > 0 ? relevantAgents : PIPELINE_AGENTS).map((agent) => {
          const status = getStageStatus(agent, stages, running, currentAgent)
          const stageData = stages.find((s) => s.agent === agent)

          return (
            <div key={agent} className="flex items-start gap-3">
              {/* Status icon */}
              <div className="mt-0.5 flex-shrink-0">
                {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                {status === 'running' && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                {status === 'pending' && <Circle className="h-5 w-5 text-gray-300" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>
                    {agent}
                  </span>
                  <span className={`text-xs ${status === 'pending' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {agentDescriptions[agent] || ''}
                  </span>
                </div>
                {stageData && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{stageData.summary}</p>
                )}
              </div>

              {/* Status badge */}
              {status === 'success' && <Badge variant="low" className="text-xs">Done</Badge>}
              {status === 'failed' && <Badge variant="critical" className="text-xs">Failed</Badge>}
              {status === 'running' && <Badge variant="info" className="text-xs">Running</Badge>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
