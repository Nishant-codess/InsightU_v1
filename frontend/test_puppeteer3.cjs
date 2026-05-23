const puppeteer = require('puppeteer');
const fs = require('fs');

async function main() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Expose a function to capture console logs from the page
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  
  // Go to homepage to set localStorage
  await page.goto('http://localhost:5173/');
  
  // Generate a valid JWT token by running a backend script to sign one, or just login via API
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nr0070@srmist.edu.in', password: 'password123' }) // wait, password123 failed before
  });
  
  await browser.close();
}
main().catch(console.error);
