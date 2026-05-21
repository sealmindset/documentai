import prisma from '@/lib/db'

interface CacheEntry {
  value: string | null
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000

export async function getSetting(key: string): Promise<string | null> {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const row = await prisma.appSetting.findUnique({ where: { key } })
  const value = row?.value ?? process.env[key] ?? null
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

export function invalidateCache(key?: string) {
  if (key) cache.delete(key)
  else cache.clear()
}

export function maskSensitive(value: string | null): string {
  if (!value) return ''
  return '********'
}

export async function getAllSettings() {
  const settings = await prisma.appSetting.findMany({ orderBy: [{ groupName: 'asc' }, { key: 'asc' }] })
  return settings.map((s) => ({
    ...s,
    value: s.isSensitive ? maskSensitive(s.value) : s.value,
  }))
}

export async function updateSetting(key: string, value: string, changedBy: string) {
  const existing = await prisma.appSetting.findUnique({ where: { key } })
  if (!existing) throw new Error(`Setting ${key} not found`)

  const oldValue = existing.isSensitive ? '********' : existing.value

  const updated = await prisma.appSetting.update({
    where: { key },
    data: { value, updatedBy: changedBy },
  })

  await prisma.appSettingAuditLog.create({
    data: {
      settingId: existing.id,
      oldValue: oldValue,
      newValue: existing.isSensitive ? '********' : value,
      changedBy,
    },
  })

  invalidateCache(key)
  return updated
}

export async function revealSetting(key: string) {
  const setting = await prisma.appSetting.findUnique({ where: { key } })
  if (!setting) throw new Error(`Setting ${key} not found`)
  return setting.value
}

export async function getAuditLog(limit = 50) {
  return prisma.appSettingAuditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { setting: { select: { key: true, displayName: true } } },
  })
}
