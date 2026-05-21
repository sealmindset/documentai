import prisma from '@/lib/db'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { invalidateCache } from '@/lib/prompts'
import { validatePromptTemplate, testPromptDraft } from '@/lib/ai/validate-template'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('prompts', 'view')
  if (denied) return denied

  const { id } = await params

  const prompt = await prisma.managedPrompt.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 20,
      },
    },
  })

  if (!prompt) {
    return Response.json({ error: 'Prompt not found' }, { status: 404 })
  }

  return Response.json(prompt)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('prompts', 'edit')
  if (denied) return denied

  const { id } = await params
  const body = await request.json()
  const { content, changeSummary, name, description, isActive, temperature, maxTokens, action } = body

  const existing = await prisma.managedPrompt.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  })

  if (!existing) {
    return Response.json({ error: 'Prompt not found' }, { status: 404 })
  }

  const user = await getCurrentUser()
  const userName = user?.name || user?.email || 'unknown'

  // Handle action-based workflow: save (draft), test, publish
  const requestedAction = action || 'save'

  // Validate content if provided
  if (content) {
    const validation = validatePromptTemplate(content)

    // Log audit entry for any edit
    await prisma.promptAuditLog.create({
      data: {
        promptId: id,
        action: requestedAction,
        riskFlag: validation.riskFlag,
        warnings: validation.warnings.length > 0 ? JSON.stringify(validation.warnings) : null,
        blockedReasons: validation.blocked ? JSON.stringify(validation.blockedReasons) : null,
        changedBy: userName,
        content: content.slice(0, 5000), // Truncate for storage
      },
    })

    // Block if content fails validation
    if (validation.blocked) {
      return Response.json(
        {
          error: 'Prompt content blocked by safety validation',
          blockedReasons: validation.blockedReasons,
          warnings: validation.warnings,
        },
        { status: 422 }
      )
    }

    // Return warnings (non-blocking) to the UI
    if (validation.warnings.length > 0 && requestedAction === 'save') {
      // Save as draft with warnings
      const nextVersion = (existing.versions[0]?.version ?? 0) + 1

      const updated = await prisma.$transaction(async (tx) => {
        if (content !== existing.content) {
          await tx.promptVersion.create({
            data: {
              promptId: id,
              version: nextVersion,
              content,
              changeSummary: changeSummary || 'Updated prompt content (draft)',
              changedBy: userName,
            },
          })
        }

        return tx.managedPrompt.update({
          where: { id },
          data: {
            ...(content !== undefined && { content }),
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(isActive !== undefined && { isActive }),
            ...(temperature !== undefined && { temperature }),
            ...(maxTokens !== undefined && { maxTokens }),
            status: 'draft',
            updatedBy: userName,
          },
          include: {
            versions: { orderBy: { version: 'desc' }, take: 5 },
          },
        })
      })

      return Response.json({
        ...updated,
        _warnings: validation.warnings,
        _message: 'Saved as draft. Review the warnings before publishing.',
      })
    }
  }

  // Handle "test" action
  if (requestedAction === 'test') {
    const testContent = content || existing.content
    const testResult = testPromptDraft(testContent)

    await prisma.promptAuditLog.create({
      data: {
        promptId: id,
        action: 'test',
        riskFlag: testResult.validationResult.riskFlag,
        warnings: JSON.stringify(testResult.adversarialTests.filter((t) => !t.passed).map((t) => t.reason)),
        changedBy: userName,
      },
    })

    const allPassed = testResult.validationResult.valid &&
      testResult.adversarialTests.every((t) => t.passed)

    // Update status to 'testing' if tests pass
    if (allPassed) {
      await prisma.managedPrompt.update({
        where: { id },
        data: { status: 'testing', updatedBy: userName },
      })
    }

    return Response.json({
      testPassed: allPassed,
      validation: testResult.validationResult,
      adversarialTests: testResult.adversarialTests,
    })
  }

  // Handle "publish" action
  if (requestedAction === 'publish') {
    // Only allow publishing if status is 'testing' (tests have been run)
    if (existing.status !== 'testing') {
      return Response.json(
        { error: 'Prompt must be tested before publishing. Run the test first.' },
        { status: 422 }
      )
    }

    const updated = await prisma.managedPrompt.update({
      where: { id },
      data: { status: 'published', updatedBy: userName },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 5 },
      },
    })

    // Invalidate cache so the published prompt takes effect
    invalidateCache(existing.slug)

    await prisma.promptAuditLog.create({
      data: {
        promptId: id,
        action: 'publish',
        riskFlag: false,
        changedBy: userName,
      },
    })

    return Response.json(updated)
  }

  // Default: save (draft or direct publish if no content change)
  const nextVersion = (existing.versions[0]?.version ?? 0) + 1
  const contentChanged = content && content !== existing.content
  const newStatus = contentChanged ? 'draft' : existing.status

  const updated = await prisma.$transaction(async (tx) => {
    if (contentChanged) {
      await tx.promptVersion.create({
        data: {
          promptId: id,
          version: nextVersion,
          content,
          changeSummary: changeSummary || 'Updated prompt content',
          changedBy: userName,
        },
      })
    }

    return tx.managedPrompt.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxTokens }),
        status: newStatus,
        updatedBy: userName,
      },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 5 },
      },
    })
  })

  // Only invalidate cache if not changing content (metadata-only edits are safe)
  if (!contentChanged) {
    invalidateCache(existing.slug)
  }

  return Response.json(updated)
}
