const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('input[type="email"]');
  
  await page.type('input[type="email"]', 'nr0070@srmist.edu.in');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
  } catch(e) {}
  
  await page.goto('http://localhost:5173/calendar');
  await new Promise(r => setTimeout(r, 2000));
  
  // Click next month 3 times
  await page.evaluate(() => {
    const nextBtn = document.querySelectorAll('button')[2]; 
    if (nextBtn) {
      nextBtn.click();
      setTimeout(() => {
        nextBtn.click();
        setTimeout(() => {
          nextBtn.click();
        }, 500);
      }, 500);
    }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const text = await page.evaluate(() => document.body.innerText);
  
  console.log("AUGUST TEXT:");
  console.log(text.substring(0, 1000));
  
  if (text.includes('Day Order 1')) {
     console.log("!!! DAY ORDER 1 FOUND !!!");
  } else {
     console.log("XXX DAY ORDER 1 NOT FOUND XXX");
  }
  
  await browser.close();
}
main().catch(console.error);
