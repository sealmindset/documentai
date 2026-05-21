'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export interface UploadedFile {
  file: File
  status: 'pending' | 'extracting' | 'done' | 'error'
  error?: string
}

interface FileUploadZoneProps {
  files: UploadedFile[]
  onFilesAdded: (newFiles: File[]) => void
  onFileRemove: (index: number) => void
  disabled?: boolean
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
]

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp,.txt'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const statusIcon = (status: UploadedFile['status']) => {
  switch (status) {
    case 'pending':
      return <FileText className="h-4 w-4 text-gray-400" />
    case 'extracting':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    case 'done':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />
  }
}

const statusBadge = (status: UploadedFile['status']) => {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>
    case 'extracting':
      return <Badge variant="info">Extracting...</Badge>
    case 'done':
      return <Badge variant="low">Done</Badge>
    case 'error':
      return <Badge variant="critical">Error</Badge>
  }
}

export function FileUploadZone({ files, onFilesAdded, onFileRemove, disabled }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (disabled) return

      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (f) => ACCEPTED_TYPES.includes(f.type) || f.name.match(/\.(pdf|docx?|xlsx?|png|jpe?g|gif|webp|txt)$/i)
      )
      if (droppedFiles.length > 0) {
        onFilesAdded(droppedFiles)
      }
    },
    [disabled, onFilesAdded]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesAdded(Array.from(e.target.files))
      e.target.value = '' // reset so same file can be re-added
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">
          Drop vendor documents here, or click to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PDF, DOCX, XLSX, images, or text files — up to 50MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={`${f.file.name}-${i}`}
              className="flex items-center gap-3 p-3 rounded-lg border bg-white"
            >
              {statusIcon(f.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(f.file.size)}</p>
                {f.error && <p className="text-xs text-red-500 mt-0.5">{f.error}</p>}
              </div>
              {statusBadge(f.status)}
              {f.status !== 'extracting' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    onFileRemove(i)
                  }}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
