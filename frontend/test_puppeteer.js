const puppeteer = require('puppeteer');

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Go to login page
  await page.goto('http://localhost:5173/login');
  
  // Wait for login form
  await page.waitForSelector('input[type="email"]');
  
  // Enter student credentials
  await page.type('input[type="email"]', 'nr0070@srmist.edu.in');
  await page.type('input[type="password"]', 'password123'); // Assume default password
  
  // Click login
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(e => console.log('Navigation timeout, proceeding anyway'));
  
  console.log('Logged in. Navigating to calendar...');
  // Go to calendar page
  await page.goto('http://localhost:5173/calendar');
  
  // Wait for some calendar element
  await page.waitForTimeout(2000); // Wait for fetch
  
  // Change to August 2026
  // (We might just extract the HTML of whatever is shown)
  const content = await page.content();
  const fs = require('fs');
  fs.writeFileSync('page_dump.html', content);
  
  console.log("Dumped page content to page_dump.html. Length:", content.length);
  await browser.close();
}
main().catch(console.error);
