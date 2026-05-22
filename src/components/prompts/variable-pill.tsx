'use client'

import { Fragment } from 'react'

interface VariablePillProps {
  text: string
}

export function VariablePill({ text }: VariablePillProps) {
  const parts = text.split(/(\{\{[^}]+\}\})/g)

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          const variable = part.slice(2, -2).trim()
          return (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-mono mx-0.5"
              title={`Variable: ${variable}`}
            >
              {variable}
            </span>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </span>
  )
}

export function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g) || []
  return [...new Set(matches.map(m => m.slice(2, -2).trim()))]
}

export function VariableList({ variables }: { variables: string[] }) {
  if (variables.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {variables.map((v) => (
        <span
          key={v}
          className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-mono"
        >
          {v}
        </span>
      ))}
    </div>
  )
}
