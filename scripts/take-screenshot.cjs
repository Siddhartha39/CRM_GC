const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function capture() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  });

  console.log('Opening page...');
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Injecting auth into localStorage...');
  await page.evaluate(() => {
    localStorage.setItem('galaxy_demo_auth', JSON.stringify({
      demoUser: {
        uid: 'demo-admin-101',
        email: 'admin@galaxycomputers.in',
        displayName: 'Vishal (Store Admin)'
      },
      demoProfile: {
        uid: 'demo-admin-101',
        email: 'admin@galaxycomputers.in',
        displayName: 'Vishal (Store Admin)',
        role: 'admin',
        status: 'active'
      }
    }));
  });

  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

  // Wait 3 seconds for data and charts
  await new Promise(r => setTimeout(r, 3500));

  const outDir = path.join(__dirname, '../docs/screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'dashboard.png');
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('✅ Screenshot successfully saved to:', outPath);

  await browser.close();
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
