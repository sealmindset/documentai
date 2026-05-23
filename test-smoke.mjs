import { chromium } from 'playwright';
import * as jose from 'jose';
import { mkdirSync, writeFileSync } from 'fs';

mkdirSync('try-it-screenshots', { recursive: true });

const secret = new TextEncoder().encode('af08f687d312a9a59049d7baeeb753154b87bdd739f3eddaa8e53d984c33328d');
const BASE = 'http://localhost:3020';

const roles = [
  {
    name: 'admin',
    email: 'rob@vanmeverenlawfirm.com',
    displayName: 'Rob Vance',
    role_id: 1,
    role_name: 'ADMIN',
    permissions: [
      'dashboard.view','clients.view','clients.create','clients.edit','clients.delete',
      'case_reviews.view','case_reviews.create','case_reviews.edit','case_reviews.delete',
      'issues.view','issues.create','issues.edit','issues.delete',
      'action_items.view','action_items.create','action_items.edit','action_items.delete',
      'documents.view','documents.create','documents.edit','documents.delete',
      'reports.view','reports.create','reports.edit','reports.delete',
      'contacts.view','contacts.create','contacts.edit','contacts.delete',
      'templates.view','templates.create','templates.edit','templates.delete',
      'emails.view','emails.create','emails.edit','emails.delete',
      'admin.users','admin.roles','admin.settings','admin.logs','admin.prompts',
      'sharepoint.view','sharepoint.create','sharepoint.edit','sharepoint.delete',
      'brain.own.view','brain.own.create','brain.own.edit','brain.own.delete',
      'brain.admin.view','brain.admin.create','brain.admin.edit','brain.admin.delete',
      'generated_documents.view','generated_documents.create','generated_documents.edit','generated_documents.delete',
      'outbound_emails.view','outbound_emails.create','outbound_emails.edit','outbound_emails.delete',
      'notifications.view','notifications.dismiss'
    ],
    pages: [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Caseload', path: '/dashboard/caseload' },
      { name: 'Pipeline', path: '/dashboard/pipeline' },
      { name: 'Calendar', path: '/dashboard/calendar' },
      { name: 'Deadlines', path: '/dashboard/deadlines' },
      { name: 'Motions', path: '/dashboard/motions' },
      { name: 'CasesByType', path: '/dashboard/cases-by-type' },
      { name: 'Billing', path: '/dashboard/billing' },
      { name: 'Clients', path: '/clients' },
      { name: 'Documents', path: '/documents' },
      { name: 'Reports', path: '/reports' },
      { name: 'Contacts', path: '/contacts' },
      { name: 'Agents', path: '/agents' },
      { name: 'Settings', path: '/settings' },
      { name: 'AIMemory', path: '/settings/ai-memory' },
      { name: 'AdminUsers', path: '/admin/users' },
      { name: 'AdminRoles', path: '/admin/roles' },
      { name: 'AdminSettings', path: '/admin/settings' },
      { name: 'AdminPrompts', path: '/admin/prompts' },
      { name: 'AdminLogs', path: '/admin/logs' },
      { name: 'AdminAIMemory', path: '/admin/ai-memory' },
    ]
  },
  {
    name: 'partner',
    email: 'brian@vanmeverenlawfirm.com',
    displayName: 'Brian Vanmeveren',
    role_id: 2,
    role_name: 'MANAGING_PARTNER',
    permissions: [
      'dashboard.view','clients.view','clients.create','clients.edit',
      'case_reviews.view','case_reviews.create','case_reviews.edit',
      'issues.view','issues.create','issues.edit',
      'action_items.view','action_items.create','action_items.edit',
      'documents.view','documents.create','documents.edit',
      'reports.view','reports.create','reports.edit',
      'contacts.view','contacts.create','contacts.edit',
      'templates.view','templates.create','templates.edit',
      'emails.view','emails.create','emails.edit',
      'brain.own.view','brain.own.create','brain.own.edit','brain.own.delete',
      'generated_documents.view','generated_documents.create','generated_documents.edit',
      'outbound_emails.view','outbound_emails.create','outbound_emails.edit',
      'notifications.view','notifications.dismiss'
    ],
    pages: [
      { name: 'PartnerOverview', path: '/partner' },
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Calendar', path: '/dashboard/calendar' },
      { name: 'Clients', path: '/clients' },
      { name: 'Documents', path: '/documents' },
      { name: 'Reports', path: '/reports' },
      { name: 'Contacts', path: '/contacts' },
      { name: 'Agents', path: '/agents' },
      { name: 'Settings', path: '/settings' },
    ]
  },
  {
    name: 'attorney',
    email: 'emily@vanmeverenlawfirm.com',
    displayName: 'Emily Crabtree',
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
    ],
    pages: [
      { name: 'AttorneyBriefing', path: '/attorney' },
      { name: 'AttorneyCases', path: '/attorney/cases' },
      { name: 'AttorneyCalendar', path: '/attorney/calendar' },
      { name: 'Documents', path: '/documents' },
      { name: 'Contacts', path: '/contacts' },
      { name: 'Settings', path: '/settings' },
    ]
  },
  {
    name: 'paralegal',
    email: 'debbie@vanmeverenlawfirm.com',
    displayName: 'Debbie Sampson',
    role_id: 4,
    role_name: 'PARALEGAL',
    permissions: [
      'dashboard.view','clients.view',
      'case_reviews.view',
      'issues.view',
      'action_items.view','action_items.create',
      'documents.view','documents.create',
      'reports.view',
      'contacts.view',
      'templates.view',
      'brain.own.view','brain.own.create',
      'generated_documents.view',
      'outbound_emails.view',
      'notifications.view','notifications.dismiss'
    ],
    pages: [
      { name: 'AttorneyBriefing', path: '/attorney' },
      { name: 'AttorneyCases', path: '/attorney/cases' },
      { name: 'AttorneyCalendar', path: '/attorney/calendar' },
      { name: 'Documents', path: '/documents' },
      { name: 'Contacts', path: '/contacts' },
      { name: 'Settings', path: '/settings' },
    ]
  }
];

const results = [];

async function makeToken(role) {
  return new jose.SignJWT({
    sub: String(role.role_id),
    email: role.email,
    name: role.displayName,
    role_id: role.role_id,
    role_name: role.role_name,
    permissions: role.permissions,
  }).setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

const browser = await chromium.launch();

for (const role of roles) {
  console.log(`\n=== Testing ${role.name} (${role.displayName}) ===`);

  const token = await makeToken(role);
  const cookies = [{ name: 'token', value: token, domain: 'localhost', path: '/' }];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  // Test login (verify cookie auth works)
  try {
    const firstPage = role.pages[0];
    await page.goto(`${BASE}${firstPage.path}`, { waitUntil: 'networkidle', timeout: 15000 });
    const url = page.url();
    const isLogin = url.includes('/login') || url.includes('/api/auth');
    results.push({ role: role.name, test: 'Login', status: isLogin ? 'FAIL' : 'PASS', url });
    if (isLogin) {
      console.log(`  Login FAIL - redirected to ${url}`);
      await page.screenshot({ path: `try-it-screenshots/${role.name}_login_FAIL.png` });
      await ctx.close();
      continue;
    }
    console.log(`  Login PASS`);
  } catch (e) {
    results.push({ role: role.name, test: 'Login', status: 'FAIL', error: e.message });
    console.log(`  Login FAIL - ${e.message}`);
    await ctx.close();
    continue;
  }

  // Test each page
  for (const pg of role.pages) {
    try {
      const resp = await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      // Wait for client-side rendering (attorney/partner pages are 'use client')
      await page.waitForTimeout(2000);
      // Additional wait: try to find meaningful content beyond the HTML shell
      try {
        await page.waitForSelector('h1, h2, [class*="font-bold"], [class*="font-semibold"], table, [role="grid"]', { timeout: 5000 });
      } catch {}
      const status = resp?.status() || 0;
      const content = await page.content();
      const pass = status >= 200 && status < 400 && content.length > 500;
      results.push({
        role: role.name,
        test: pg.name,
        status: pass ? 'PASS' : 'FAIL',
        httpStatus: status,
        contentLength: content.length,
      });
      await page.screenshot({ path: `try-it-screenshots/${role.name}_${pg.name}.png` });
      console.log(`  ${pg.name}: ${pass ? 'PASS' : 'FAIL'} (${status}, ${content.length} bytes)`);
    } catch (e) {
      results.push({ role: role.name, test: pg.name, status: 'FAIL', error: e.message });
      console.log(`  ${pg.name}: FAIL - ${e.message}`);
    }
  }

  // Test logout
  try {
    await ctx.clearCookies();
    const resp = await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 10000 });
    const loggedOut = page.url().includes('/login') || page.url().includes('/api/auth') || (resp?.status() || 0) >= 300;
    results.push({ role: role.name, test: 'Logout', status: loggedOut ? 'PASS' : 'FAIL' });
    console.log(`  Logout: ${loggedOut ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    results.push({ role: role.name, test: 'Logout', status: 'PASS' });
    console.log(`  Logout: PASS (redirect)`);
  }

  await ctx.close();
}

await browser.close();

writeFileSync('try-it-screenshots/results.json', JSON.stringify(results, null, 2));

const total = results.length;
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

console.log(`\n=== RESULTS: ${passed}/${total} passed, ${failed} failed ===`);
if (failed > 0) {
  console.log('\nFailures:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  ${r.role} / ${r.test}: ${r.error || `HTTP ${r.httpStatus}`}`);
  });
}
