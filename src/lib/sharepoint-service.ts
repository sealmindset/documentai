/**
 * SharePoint service — reads files from SharePoint document libraries via Microsoft Graph.
 *
 * Required Entra app permissions: Sites.Read.All, Files.Read.All (Application)
 */

import { graphFetch, isGraphConfigured } from './graph-client'
import prisma from './db'

export interface SharePointSite {
  id: string
  name: string
  displayName: string
  webUrl: string
}

export interface SharePointLibrary {
  id: string
  name: string
  description: string
  webUrl: string
}

export interface SharePointFile {
  id: string
  name: string
  size: number
  mimeType: string
  webUrl: string
  lastModifiedDateTime: string
  createdDateTime: string
  downloadUrl?: string
}

export interface SyncResult {
  filesFound: number
  filesNew: number
  filesUpdated: number
  filesSkipped: number
  errors: string[]
}

export async function listSites(): Promise<SharePointSite[]> {
  const res = await graphFetch('/sites?search=*&$top=50&$select=id,name,displayName,webUrl')
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to list SharePoint sites: ${res.status} ${body}`)
  }
  const data = await res.json()
  return (data.value || []).map((s: Record<string, string>) => ({
    id: s.id,
    name: s.name,
    displayName: s.displayName,
    webUrl: s.webUrl,
  }))
}

export async function listLibraries(siteId: string): Promise<SharePointLibrary[]> {
  const res = await graphFetch(`/sites/${siteId}/drives?$select=id,name,description,webUrl`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to list libraries: ${res.status} ${body}`)
  }
  const data = await res.json()
  return (data.value || []).map((d: Record<string, string>) => ({
    id: d.id,
    name: d.name,
    description: d.description || '',
    webUrl: d.webUrl,
  }))
}

export async function listFiles(
  driveId: string,
  folderPath?: string
): Promise<SharePointFile[]> {
  const path = folderPath
    ? `/drives/${driveId}/root:/${encodeURIComponent(folderPath)}:/children`
    : `/drives/${driveId}/root/children`

  const select = '$select=id,name,size,file,webUrl,lastModifiedDateTime,createdDateTime,@microsoft.graph.downloadUrl'
  const res = await graphFetch(`${path}?${select}&$top=200`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to list files: ${res.status} ${body}`)
  }
  const data = await res.json()
  return (data.value || [])
    .filter((item: Record<string, unknown>) => item.file)
    .map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: item.name as string,
      size: item.size as number,
      mimeType: (item.file as Record<string, string>)?.mimeType || 'application/octet-stream',
      webUrl: item.webUrl as string,
      lastModifiedDateTime: item.lastModifiedDateTime as string,
      createdDateTime: item.createdDateTime as string,
      downloadUrl: item['@microsoft.graph.downloadUrl'] as string | undefined,
    }))
}

export async function downloadFile(driveId: string, itemId: string): Promise<{
  content: Buffer
  mimeType: string
  name: string
}> {
  const metaRes = await graphFetch(
    `/drives/${driveId}/items/${itemId}?$select=name,file,@microsoft.graph.downloadUrl`
  )
  if (!metaRes.ok) {
    throw new Error(`Failed to get file metadata: ${metaRes.status}`)
  }
  const meta = await metaRes.json()

  const downloadUrl = meta['@microsoft.graph.downloadUrl']
  if (!downloadUrl) {
    throw new Error(`No download URL for item ${itemId}`)
  }

  const fileRes = await fetch(downloadUrl)
  if (!fileRes.ok) {
    throw new Error(`Failed to download file: ${fileRes.status}`)
  }

  const arrayBuffer = await fileRes.arrayBuffer()
  return {
    content: Buffer.from(arrayBuffer),
    mimeType: meta.file?.mimeType || 'application/octet-stream',
    name: meta.name,
  }
}

export async function syncLibrary(configId: string): Promise<SyncResult> {
  const config = await prisma.sharePointSync.findUnique({
    where: { id: configId },
  })

  if (!config || !config.isEnabled) {
    throw new Error('Sync configuration not found or disabled')
  }

  const result: SyncResult = {
    filesFound: 0,
    filesNew: 0,
    filesUpdated: 0,
    filesSkipped: 0,
    errors: [],
  }

  await prisma.sharePointSync.update({
    where: { id: configId },
    data: { lastSyncStatus: 'SYNCING', lastSyncAt: new Date() },
  })

  try {
    const files = await listFiles(config.driveId, config.folderPath || undefined)
    result.filesFound = files.length

    const supportedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/tiff',
    ]

    for (const file of files) {
      if (!supportedTypes.some(t => file.mimeType.startsWith(t.split('/')[0]) || file.mimeType === t)) {
        result.filesSkipped++
        continue
      }

      try {
        const existing = await prisma.sharePointFile.findUnique({
          where: {
            syncConfigId_sharepointItemId: {
              syncConfigId: configId,
              sharepointItemId: file.id,
            },
          },
        })

        if (existing) {
          const remoteModified = new Date(file.lastModifiedDateTime)
          if (existing.lastModifiedAt && remoteModified <= existing.lastModifiedAt) {
            result.filesSkipped++
            continue
          }
          await prisma.sharePointFile.update({
            where: { id: existing.id },
            data: {
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.mimeType,
              lastModifiedAt: remoteModified,
              status: 'PENDING',
            },
          })
          result.filesUpdated++
        } else {
          await prisma.sharePointFile.create({
            data: {
              syncConfigId: configId,
              sharepointItemId: file.id,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.mimeType,
              webUrl: file.webUrl,
              lastModifiedAt: new Date(file.lastModifiedDateTime),
              status: 'PENDING',
            },
          })
          result.filesNew++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        result.errors.push(`${file.name}: ${msg}`)
      }
    }

    await prisma.sharePointSync.update({
      where: { id: configId },
      data: {
        lastSyncStatus: result.errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
        lastSyncAt: new Date(),
        lastSyncFileCount: result.filesFound,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await prisma.sharePointSync.update({
      where: { id: configId },
      data: { lastSyncStatus: 'FAILED', lastSyncError: msg },
    })
    throw err
  }

  return result
}

export async function processFile(
  fileRecordId: string,
  driveId: string
): Promise<{ documentId: string; clientName: string | null }> {
  const fileRecord = await prisma.sharePointFile.findUnique({
    where: { id: fileRecordId },
  })
  if (!fileRecord) throw new Error('File record not found')

  await prisma.sharePointFile.update({
    where: { id: fileRecordId },
    data: { status: 'PROCESSING' },
  })

  try {
    const { content, mimeType, name } = await downloadFile(driveId, fileRecord.sharepointItemId)

    let textContent: string
    const isImage = mimeType.startsWith('image/')

    if (isImage) {
      textContent = content.toString('base64')
    } else if (mimeType === 'application/pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
      const parsed = await pdfParse(content)
      textContent = parsed.text
    } else {
      textContent = content.toString('utf-8')
    }

    const { aura } = await import('./agents/aura')
    const extractResult = await aura.execute({
      text: isImage ? '' : textContent,
      fileName: name,
      isImage,
      imageBase64: isImage ? textContent : undefined,
      imageMime: isImage ? mimeType : undefined,
    })

    if (!extractResult.success || !extractResult.data) {
      throw new Error(extractResult.error || 'AURA extraction failed')
    }

    const extraction = extractResult.data
    const clientName = extraction.clientInfo?.name || null
    const docType = extraction.documentAnalysis?.documentType || 'OTHER'

    let clientId: string | null = null
    if (clientName) {
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { name: { contains: clientName, mode: 'insensitive' } },
            { legalName: { contains: clientName, mode: 'insensitive' } },
          ],
        },
      })
      clientId = client?.id || null
    }

    if (!clientId) {
      const unassigned = await prisma.client.findFirst({
        where: { name: 'Unassigned Documents' },
      })
      if (unassigned) {
        clientId = unassigned.id
      } else {
        const created = await prisma.client.create({
          data: {
            name: 'Unassigned Documents',
            status: 'ACTIVE',
            caseType: 'OTHER',
          },
        })
        clientId = created.id
      }
    }

    const document = await prisma.document.create({
      data: {
        clientId,
        documentType: docType,
        documentName: name,
        fileSize: fileRecord.fileSize,
        mimeType,
        status: 'ANALYZED',
        source: 'SharePoint',
        analysisResult: JSON.stringify(extraction),
        isCurrent: true,
      },
    })

    await prisma.sharePointFile.update({
      where: { id: fileRecordId },
      data: {
        status: 'PROCESSED',
        documentId: document.id,
        processedAt: new Date(),
      },
    })

    return { documentId: document.id, clientName }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await prisma.sharePointFile.update({
      where: { id: fileRecordId },
      data: { status: 'FAILED', errorMessage: msg },
    })
    throw err
  }
}

export function isSharePointConfigured(): boolean {
  return isGraphConfigured()
}
