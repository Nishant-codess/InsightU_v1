const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Expose a function to capture console logs from the page
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  
  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('input[type="email"]');
  
  await page.type('input[type="email"]', 'nr0070@srmist.edu.in');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
  } catch (e) {
    console.log("Navigation timeout, proceeding anyway");
  }
  
  await page.goto('http://localhost:5173/calendar');
  
  // Wait for 3 seconds for fetch to complete
  await new Promise(r => setTimeout(r, 3000));
  
  // Let's inject a script to switch the month to August 2026
  await page.evaluate(() => {
    // We can't directly call React state, but we can click the "Next Month" button 3 times (from May to August)
    const nextBtn = document.querySelectorAll('button')[2]; // The right arrow button
    if (nextBtn) {
      nextBtn.click(); // Jun
      setTimeout(() => {
        nextBtn.click(); // Jul
        setTimeout(() => {
          nextBtn.click(); // Aug
        }, 500);
      }, 500);
    }
  });
  
  await new Promise(r => setTimeout(r, 2000)); // wait for clicks to settle
  
  const text = await page.evaluate(() => document.body.innerText);
  
  if (text.includes('August')) {
    console.log("Navigated to August");
  }
  
  if (text.includes('Day Order 1') || text.includes('Day Order 2')) {
     console.log("!!! DAY ORDER FOUND !!!");
     const snippets = text.split('\n').filter(l => l.includes('Day Order'));
     console.log(snippets);
  } else {
     console.log("XXX DAY ORDER NOT FOUND XXX");
     console.log("Text snippet of the page:");
     console.log(text.substring(0, 500));
  }
  
  await browser.close();
}
main().catch(console.error);
