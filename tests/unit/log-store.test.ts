import { describe, it, expect, beforeEach } from 'vitest'

// LogStore is a singleton on globalThis, so we need to test it carefully.
// Import the module to get the class behavior; we'll test via a fresh instance.

// We can't easily import LogStore directly since it's not exported as a class.
// Instead we test through the singleton's behavior by importing the module.
// For isolated tests, we'll recreate the behavior inline.

describe('LogStore behavior', () => {
  // Inline LogStore for isolated testing (mirrors src/lib/log-store.ts)
  class TestLogStore {
    private buffer: Array<Record<string, unknown>> = []
    private maxSize: number
    private totalReceived = 0

    constructor(maxSize: number) {
      this.maxSize = maxSize
    }

    push(entry: Record<string, unknown>) {
      this.totalReceived++
      this.buffer.push({
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
      })
      if (this.buffer.length > this.maxSize) {
        this.buffer.shift()
      }
    }

    getBuffer() { return this.buffer }
    getTotal() { return this.totalReceived }
    getSize() { return this.buffer.length }
    clear() { this.buffer = [] }
  }

  let store: TestLogStore

  beforeEach(() => {
    store = new TestLogStore(5)
  })

  it('stores entries up to max size', () => {
    for (let i = 0; i < 5; i++) {
      store.push({ method: 'GET', path: `/api/test-${i}`, status: 200 })
    }
    expect(store.getSize()).toBe(5)
  })

  it('evicts oldest entries when buffer exceeds max', () => {
    for (let i = 0; i < 8; i++) {
      store.push({ method: 'GET', path: `/api/test-${i}`, status: 200 })
    }
    expect(store.getSize()).toBe(5)
    expect(store.getTotal()).toBe(8)
    const paths = store.getBuffer().map(e => e.path)
    expect(paths).not.toContain('/api/test-0')
    expect(paths).toContain('/api/test-7')
  })

  it('assigns unique IDs and timestamps', () => {
    store.push({ method: 'GET', path: '/api/a', status: 200 })
    store.push({ method: 'GET', path: '/api/b', status: 200 })
    const [a, b] = store.getBuffer()
    expect(a.id).not.toBe(b.id)
    expect(a.timestamp).toBeTruthy()
    expect(b.timestamp).toBeTruthy()
  })

  it('clears the buffer', () => {
    store.push({ method: 'GET', path: '/api/test', status: 200 })
    store.clear()
    expect(store.getSize()).toBe(0)
  })
})

describe('LogStore singleton (integration)', () => {
  it('exports a logStore singleton', async () => {
    const { logStore } = await import('@/lib/log-store')
    expect(logStore).toBeDefined()
    expect(typeof logStore.push).toBe('function')
    expect(typeof logStore.query).toBe('function')
    expect(typeof logStore.stats).toBe('function')
    expect(typeof logStore.clear).toBe('function')
  })

  it('query filters by type', async () => {
    const { logStore } = await import('@/lib/log-store')
    logStore.clear()

    logStore.push({ type: 'INBOUND', method: 'GET', path: '/api/clients', status: 200, durationMs: 50 })
    logStore.push({ type: 'OUTBOUND', method: 'POST', path: '/external/api', status: 200, durationMs: 100, service: 'jira' })

    const inbound = logStore.query({ type: 'INBOUND' })
    expect(inbound.events.every(e => e.type === 'INBOUND')).toBe(true)

    const outbound = logStore.query({ type: 'OUTBOUND' })
    expect(outbound.events.every(e => e.type === 'OUTBOUND')).toBe(true)
  })

  it('query supports text search', async () => {
    const { logStore } = await import('@/lib/log-store')
    logStore.clear()

    logStore.push({ type: 'INBOUND', method: 'GET', path: '/api/clients', status: 200, durationMs: 10 })
    logStore.push({ type: 'INBOUND', method: 'GET', path: '/api/contacts', status: 200, durationMs: 10 })

    const result = logStore.query({ search: 'clients' })
    expect(result.events).toHaveLength(1)
    expect(result.events[0].path).toContain('clients')
  })

  it('stats returns correct structure', async () => {
    const { logStore } = await import('@/lib/log-store')
    const stats = logStore.stats()
    expect(stats).toHaveProperty('bufferSize')
    expect(stats).toHaveProperty('maxSize')
    expect(stats).toHaveProperty('totalReceived')
    expect(stats).toHaveProperty('inboundCount')
    expect(stats).toHaveProperty('outboundCount')
    expect(stats).toHaveProperty('recentErrors')
    expect(stats).toHaveProperty('status2xx')
    expect(stats).toHaveProperty('status4xx')
    expect(stats).toHaveProperty('status5xx')
  })

  it('skips noise paths', async () => {
    const { logStore } = await import('@/lib/log-store')
    logStore.clear()

    logStore.push({ type: 'INBOUND', method: 'GET', path: '/health', status: 200, durationMs: 1 })
    logStore.push({ type: 'INBOUND', method: 'GET', path: '/_next/static/chunk.js', status: 200, durationMs: 1 })
    logStore.push({ type: 'INBOUND', method: 'GET', path: '/favicon.ico', status: 200, durationMs: 1 })
    logStore.push({ type: 'INBOUND', method: 'GET', path: '/api/clients', status: 200, durationMs: 10 })

    const result = logStore.query({})
    expect(result.events).toHaveLength(1)
    expect(result.events[0].path).toContain('clients')
  })
})
