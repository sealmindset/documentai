type LogEntryType = 'INBOUND' | 'OUTBOUND'

export interface LogEntry {
  id: string
  type: LogEntryType
  timestamp: string
  method: string
  path: string
  status: number
  durationMs: number
  userEmail?: string
  userRole?: string
  ip?: string
  userAgent?: string
  service?: string
  error?: string
}

interface LogStats {
  bufferSize: number
  maxSize: number
  totalReceived: number
  inboundCount: number
  outboundCount: number
  recentErrors: number
  status2xx: number
  status4xx: number
  status5xx: number
}

const NOISE_PATTERNS = [
  '/health',
  '/healthz',
  '/_next',
  '/favicon.ico',
  '.js',
  '.css',
  '.ico',
  '.png',
  '.svg',
  '.woff',
  '.woff2',
  '.map',
]

const SENSITIVE_PARAMS = ['token', 'key', 'secret', 'password', 'api_key', 'apikey', 'authorization']

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost')
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_PARAMS.some((s) => key.toLowerCase().includes(s))) {
        parsed.searchParams.set(key, '***')
      }
    }
    return parsed.pathname + parsed.search
  } catch {
    return url
  }
}

function isNoise(path: string): boolean {
  return NOISE_PATTERNS.some((p) => path.includes(p))
}

class LogStore {
  private buffer: LogEntry[] = []
  private maxSize: number
  private totalReceived = 0

  constructor(maxSize?: number) {
    this.maxSize = maxSize ?? parseInt(process.env.LOG_BUFFER_SIZE || '10000', 10)
  }

  push(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    if (isNoise(entry.path)) return

    this.totalReceived++
    const full: LogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      path: sanitizeUrl(entry.path),
    }

    this.buffer.push(full)
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift()
    }
  }

  query(filters?: {
    type?: LogEntryType
    method?: string
    service?: string
    search?: string
    limit?: number
    offset?: number
  }): { events: LogEntry[]; total: number } {
    let filtered = [...this.buffer]

    if (filters?.type) filtered = filtered.filter((e) => e.type === filters.type)
    if (filters?.method) filtered = filtered.filter((e) => e.method === filters.method)
    if (filters?.service) filtered = filtered.filter((e) => e.service === filters.service)
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.userEmail?.toLowerCase().includes(q) ||
          e.service?.toLowerCase().includes(q) ||
          e.error?.toLowerCase().includes(q)
      )
    }

    filtered.reverse()
    const total = filtered.length
    const limit = filters?.limit ?? 100
    const offset = filters?.offset ?? 0
    return { events: filtered.slice(offset, offset + limit), total }
  }

  stats(): LogStats {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    return {
      bufferSize: this.buffer.length,
      maxSize: this.maxSize,
      totalReceived: this.totalReceived,
      inboundCount: this.buffer.filter((e) => e.type === 'INBOUND').length,
      outboundCount: this.buffer.filter((e) => e.type === 'OUTBOUND').length,
      recentErrors: this.buffer.filter(
        (e) => e.status >= 500 && new Date(e.timestamp).getTime() > fiveMinAgo
      ).length,
      status2xx: this.buffer.filter((e) => e.status >= 200 && e.status < 300).length,
      status4xx: this.buffer.filter((e) => e.status >= 400 && e.status < 500).length,
      status5xx: this.buffer.filter((e) => e.status >= 500).length,
    }
  }

  clear() {
    this.buffer = []
  }
}

const g = globalThis as typeof globalThis & { __logStore?: LogStore }
export const logStore = (g.__logStore ??= new LogStore())
