import { chromium } from 'playwright';
import * as jose from 'jose';
import { mkdirSync } from 'fs';

mkdirSync('try-it-screenshots', { recursive: true });

const secret = new TextEncoder().encode('af08f687d312a9a59049d7baeeb753154b87bdd739f3eddaa8e53d984c33328d');
const BASE = 'http://localhost:3020';

const token = await new jose.SignJWT({
  sub: '3',
  email: 'emily@vanmeverenlawfirm.com',
  name: 'Emily Crabtree',
  role_id: 3,
  role_name: 'ATTORNEY',
  permissions: [
    'dashboard.view','clients.view','clients.create','clients.edit',
    'case_reviews.view','case_reviews.create',
    'issues.view','issues.create',
    'action_items.view','action_items.create','action_items.edit',
    'documents.view','documents.create','documents.edit',
    'reports.view',
    'contacts.view','contacts.create','contacts.edit',
    'templates.view',
    'emails.view','emails.create',
    'brain.own.view','brain.own.create','brain.own.edit','brain.own.delete',
    'generated_documents.view','generated_documents.create',
    'outbound_emails.view','outbound_emails.create',
    'notifications.view','notifications.dismiss'
  ]
}).setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(secret);

const cookies = [{ name: 'token', value: token, domain: 'localhost', path: '/' }];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies(cookies);
const page = await ctx.newPage();

// Go to cases page to get a case ID
console.log('Loading cases...');
await page.goto(`${BASE}/attorney/cases`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);

// Click on the first case
const caseLink = page.locator('a[href^="/attorney/cases/"]').first();
const href = await caseLink.getAttribute('href');
console.log('Navigating to case:', href);
await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);

// Take Overview screenshot
await page.screenshot({ path: 'try-it-screenshots/attorney_CaseDetail_Overview.png' });
console.log('Overview screenshot taken');

// Click the Actions tab
const actionsTab = page.locator('button', { hasText: 'Actions' });
await actionsTab.click();
await page.waitForTimeout(1500);

await page.screenshot({ path: 'try-it-screenshots/attorney_CaseDetail_Actions.png' });
console.log('Actions tab screenshot taken');

await browser.close();
console.log('Done!');
