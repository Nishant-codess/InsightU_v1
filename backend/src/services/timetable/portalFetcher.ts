import puppeteer, { Browser, Page, Frame } from 'puppeteer';

export type PortalAuthErrorCode = 'INVALID_CREDENTIALS' | 'PORTAL_UNREACHABLE' | 'SESSION_TIMEOUT';

export class PortalAuthError extends Error {
  constructor(public readonly code: PortalAuthErrorCode, message: string) {
    super(message);
    this.name = 'PortalAuthError';
  }
}

const PORTAL_LOGIN_URL = 'https://academia.srmist.edu.in/';
const PAGES = {
  timetable:  'https://academia.srmist.edu.in/#Page:My_Time_Table_2023_24',
  attendance: 'https://academia.srmist.edu.in/#Page:My_Attendance',
  marks:      'https://academia.srmist.edu.in/#Page:My_Marks',
};
const NAV_TIMEOUT = 45_000;
const SEL_TIMEOUT = 20_000;

async function getLoginFrame(page: Page): Promise<Frame> {
  const deadline = Date.now() + SEL_TIMEOUT;
  while (Date.now() < deadline) {
    const frame = page.frames().find(f => f.url().includes('accounts') && f.url().includes('signin'));
    if (frame) return frame;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new PortalAuthError('PORTAL_UNREACHABLE', 'Login iframe did not load.');
}

async function loginWithFrame(page: Page, loginId: string, password: string): Promise<void> {
  const frame = await getLoginFrame(page);
  await frame.waitForSelector('#login_id', { timeout: SEL_TIMEOUT });
  await frame.type('#login_id', loginId, { delay: 40 });
  await frame.click('#nextbtn');

  try {
    await frame.waitForFunction(
      () => { const p = document.querySelector('#password') as HTMLElement | null; return p && p.offsetParent !== null; },
      { timeout: SEL_TIMEOUT }
    );
  } catch {
    throw new PortalAuthError('INVALID_CREDENTIALS', 'Password field did not appear. Check your email ID.');
  }

  await new Promise(r => setTimeout(r, 800));
  await frame.type('#password', password, { delay: 40 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT }).catch(() => {}),
    frame.click('#nextbtn'),
  ]);
  await new Promise(r => setTimeout(r, 2000));
}

async function handleIntermediatePages(page: Page): Promise<void> {
  let currentUrl = page.url();

  if (currentUrl.includes('block-sessions') || currentUrl.includes('preannouncement')) {
    const skipped = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a, button')) as HTMLElement[];
      const skip = els.find(el => el.innerText && el.innerText.toLowerCase().includes('skip'));
      if (skip) { skip.click(); return true; }
      return false;
    });

    if (!skipped) {
      await page.evaluate(() => {
        const btn = document.querySelector('#continue_button') as HTMLElement | null;
        if (btn) btn.click();
      });
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT }).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));
      // Need to re-login — caller handles this
      return;
    }
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    currentUrl = page.url();
  }

  if (currentUrl.includes('sessions-reminder') || currentUrl.includes('announcement')) {
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a, button')) as HTMLElement[];
      const skip = els.find(el => el.innerText && el.innerText.toLowerCase().includes('skip'));
      if (skip) skip.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function launchAndLogin(loginId: string, password: string): Promise<{ browser: Browser; page: Page }> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  page.setDefaultTimeout(SEL_TIMEOUT);

  try {
    await page.goto(PORTAL_LOGIN_URL, { waitUntil: 'networkidle2' });
  } catch {
    await browser.close();
    throw new PortalAuthError('PORTAL_UNREACHABLE', 'SRM portal is unreachable.');
  }

  await loginWithFrame(page, loginId, password);
  await handleIntermediatePages(page);

  // If still on login/block page, try re-login once
  let url = page.url();
  if (url.includes('block-sessions') || url.includes('preannouncement') || url === PORTAL_LOGIN_URL) {
    await new Promise(r => setTimeout(r, 3000));
    await page.goto(PORTAL_LOGIN_URL, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await loginWithFrame(page, loginId, password);
    await handleIntermediatePages(page);
    url = page.url();
  }

  if (url.includes('login') || url.includes('signin') || url === PORTAL_LOGIN_URL) {
    await browser.close();
    throw new PortalAuthError('INVALID_CREDENTIALS', 'Invalid SRM credentials.');
  }

  return { browser, page };
}

async function fetchPage(page: Page, url: string): Promise<string> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
  } catch {
    throw new PortalAuthError('SESSION_TIMEOUT', `Could not navigate to ${url}`);
  }
  if (page.url().includes('login') || page.url().includes('signin')) {
    throw new PortalAuthError('SESSION_TIMEOUT', 'Session expired during navigation.');
  }
  await page.waitForSelector('table', { timeout: SEL_TIMEOUT }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500)); // let JS render
  return page.content();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchPortalHTML(loginId: string, password: string): Promise<string> {
  const { browser, page } = await launchAndLogin(loginId, password);
  try {
    return await fetchPage(page, PAGES.timetable);
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function fetchMultiplePages(
  loginId: string,
  password: string,
  pageKeys: (keyof typeof PAGES)[]
): Promise<Record<string, string>> {
  const { browser, page } = await launchAndLogin(loginId, password);
  const results: Record<string, string> = {};
  try {
    for (const key of pageKeys) {
      results[key] = await fetchPage(page, PAGES[key]);
    }
    return results;
  } finally {
    await browser.close().catch(() => {});
  }
}
