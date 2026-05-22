import { NextRequest } from 'next/server'
import { logStore } from './log-store'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<Response>

export function withRequestLog<T extends RouteHandler>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    const req = args[0] as NextRequest
    const start = Date.now()
    let status = 500
    let errorMsg: string | undefined
    try {
      const response = await handler(...args)
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
  }) as T
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
