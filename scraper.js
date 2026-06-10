const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  const url =
    'https://www.realestate.com.au/buy/in-sydney,+nsw+2000/list-1?activeSort=list-date';

  console.log('Opening:', url);

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(10000);

  const html = await page.content();

  console.log('HTML LENGTH:', html.length);

  console.log(
    'Contains listing_search_results:',
    html.includes('listing_search_results')
  );

  console.log(
    'Contains BuyResidentialListing:',
    html.includes('BuyResidentialListing')
  );

  console.log('================ START HTML ================');

  console.log(html.substring(0, 5000));

  console.log('================ END HTML =================');

  await browser.close();
}

run().catch(console.error);
