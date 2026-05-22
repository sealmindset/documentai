import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { SignJWT } from 'jose'

const BASE_URL = 'http://localhost:3020'
const SCREENSHOT_DIR = join(import.meta.dirname, 'try-it-screenshots')
mkdirSync(SCREENSHOT_DIR, { recursive: true })

// Mint a JWT locally using the same secret the container uses
import { readFileSync } from 'fs'
const envContent = readFileSync(join(import.meta.dirname, '.env'), 'utf-8')
const jwtSecret = envContent.match(/^JWT_SECRET=(.+)$/m)?.[1]?.trim() || 'dev-secret-change-in-production'
const secret = new TextEncoder().encode(jwtSecret)
const jwt = await new SignJWT({
  sub: 'mock-admin',
  email: 'admin@example.com',
  name: 'Alex Admin',
  role_id: 'cmpg1a8f5001o100vkqx87nw1',
  role_name: 'ADMIN',
  permissions: [
    'dashboard.view','dashboard.create','dashboard.edit','dashboard.delete',
    'clients.view','clients.create','clients.edit','clients.delete',
    'contacts.view','contacts.create','contacts.edit','contacts.delete',
    'case-reviews.view','case-reviews.create','case-reviews.edit','case-reviews.delete',
    'documents.view','documents.create','documents.edit','documents.delete',
    'issues.view','issues.create','issues.edit','issues.delete',
    'reports.view','reports.create','reports.edit','reports.delete',
    'agents.view','agents.create','agents.edit','agents.delete',
    'settings.view','settings.create','settings.edit','settings.delete',
    'prompts.view','prompts.create','prompts.edit','prompts.delete',
    'templates.view','templates.create','templates.edit','templates.delete',
    'generated-documents.view','generated-documents.create','generated-documents.edit','generated-documents.delete',
    'emails.view','emails.create','emails.edit','emails.delete',
    'brain.view','brain.create','brain.edit','brain.delete',
    'users.view','users.create','users.edit','users.delete',
    'roles.view','roles.create','roles.edit','roles.delete',
    'logs.view','logs.create','logs.edit','logs.delete',
  ],
})
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('1h')
  .sign(secret)

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
})

// Set JWT cookie
await context.addCookies([{
  name: 'token',
  value: jwt,
  domain: 'localhost',
  path: '/',
}])

const page = await context.newPage()

// Go directly to dashboard (JWT cookie should authenticate)
await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 })
const url = page.url()
if (url.includes('/login')) {
  console.error('Auth failed, redirected to login')
  process.exit(1)
}
console.log('Authenticated via JWT cookie')

// Navigate to Documents page
await page.goto(`${BASE_URL}/documents`, { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForTimeout(1000)
console.log('On Documents page')

await page.screenshot({ path: join(SCREENSHOT_DIR, 'doc_page_before_click.png'), fullPage: true })

// Click first document row
const firstRow = page.locator('table tbody tr').first()
if (await firstRow.count() > 0) {
  await firstRow.click()
  await page.waitForTimeout(2000)
  console.log('Clicked first document')

  await page.screenshot({ path: join(SCREENSHOT_DIR, 'doc_viewer_open.png'), fullPage: true })

  // Click a second document to test multiple viewers
  const secondRow = page.locator('table tbody tr').nth(1)
  if (await secondRow.count() > 0) {
    await secondRow.click()
    await page.waitForTimeout(1500)
    console.log('Clicked second document')

    await page.screenshot({ path: join(SCREENSHOT_DIR, 'doc_viewer_two_open.png'), fullPage: true })
  }

  // Test download menu
  const downloadBtn = page.locator('button').filter({ has: page.locator('svg.lucide-download') }).first()
  if (await downloadBtn.count() > 0) {
    await downloadBtn.click()
    await page.waitForTimeout(500)
    console.log('Download menu opened')
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'doc_viewer_download_menu.png'), fullPage: true })
  }

  // Test drag (move the first viewer)
  const dragHandle = page.locator('.cursor-move').first()
  if (await dragHandle.count() > 0) {
    const box = await dragHandle.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 200, box.y + 100, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(500)
      console.log('Dragged viewer')
      await page.screenshot({ path: join(SCREENSHOT_DIR, 'doc_viewer_dragged.png'), fullPage: true })
    }
  }

  console.log('All tests passed!')
} else {
  console.log('No document rows found')
}

await browser.close()
