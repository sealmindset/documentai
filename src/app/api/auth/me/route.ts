import { getAuthCookie, verifyToken } from '@/lib/auth'

export async function GET() {
  const token = await getAuthCookie()
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  return Response.json(payload)
}
