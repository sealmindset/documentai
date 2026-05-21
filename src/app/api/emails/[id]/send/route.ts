import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { echo } from '@/lib/agents'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('emails', 'edit')
  if (denied) return denied

  const { id } = await params

  try {
    const result = await echo.send(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.data?.messageId,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
