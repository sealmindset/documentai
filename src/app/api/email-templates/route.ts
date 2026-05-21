import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  const denied = await requirePermission('emails', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = category

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching email templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}
