const puppeteer = require('puppeteer');
const fs = require('fs');

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('input[type="email"]');
  
  await page.type('input[type="email"]', 'nr0070@srmist.edu.in');
  await page.type('input[type="password"]', 'password123'); // Assume default password
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(e => console.log('Navigation timeout, proceeding'));
  
  console.log('Logged in. Navigating to calendar...');
  await page.goto('http://localhost:5173/calendar');
  
  // Wait for fetch to complete and UI to update
  await page.waitForTimeout(3000);
  
  // Scrape all text that matches Day Order
  const content = await page.content();
  fs.writeFileSync('page_dump.html', content);
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("PAGE TEXT EXTRACT:");
  console.log(text.substring(0, 1000));
  
  if (text.includes('Day Order')) {
     console.log("!!! DAY ORDER FOUND IN HTML !!!");
  } else {
     console.log("XXX DAY ORDER NOT FOUND XXX");
  }
  
  await browser.close();
}
main().catch(console.error);
