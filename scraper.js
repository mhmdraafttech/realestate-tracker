const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  await page.goto(
    'https://www.realestate.com.au/buy/in-sydney,+NSW+2000/list-1?activeSort=list-date',
    { waitUntil: 'networkidle', timeout: 60000 }
  );

  await page.waitForTimeout(8000);

  // نشوف إيه الـ selectors الموجودة فعلاً
  const debug = await page.evaluate(() => {
    return {
      title: document.title,
      bodyLength: document.body.innerHTML.length,
      hasListings: document.querySelectorAll('[data-testid]').length,
      testIds: [...new Set([...document.querySelectorAll('[data-testid]')].map(el => el.getAttribute('data-testid')).filter(Boolean))].slice(0, 30),
      blockedSign: document.body.innerText.includes('blocked') || document.body.innerText.includes('captcha')
    };
  });

  console.log(JSON.stringify(debug, null, 2));
  await browser.close();
}

run().catch(console.error);
