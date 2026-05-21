import { NextRequest, NextResponse } from 'next/server'
import { logStore } from './log-store'

export function withRequestLog(
  handler: (req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => Promise<NextResponse | Response>
) {
  return async (req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => {
    const start = Date.now()
    let status = 500
    let errorMsg: string | undefined
    try {
      const response = await handler(req, ctx)
      status = response.status
      return response
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      logStore.push({
        type: 'INBOUND',
        method: req.method,
        path: req.nextUrl.pathname + req.nextUrl.search,
        status,
        durationMs: Date.now() - start,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: req.headers.get('user-agent') || undefined,
        error: errorMsg,
      })
    }
  }
}

export function logOutbound(entry: {
  service: string
  method: string
  path: string
  status: number
  durationMs: number
  error?: string
}) {
  logStore.push({ type: 'OUTBOUND', ...entry })
}
