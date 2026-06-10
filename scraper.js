const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  await page.goto(
    'https://www.realestate.com.au/buy/in-sydney,+nsw+2000/list-1',
    {
      waitUntil: 'networkidle',
      timeout: 120000
    }
  );

  await page.waitForTimeout(10000);

  const html = await page.content();

  console.log(
    'Contains listing_search_results:',
    html.includes('listing_search_results')
  );

  console.log(
    'Contains BuyResidentialListing:',
    html.includes('BuyResidentialListing')
  );

  const idx = html.indexOf('148401960');

  console.log(
    html.substring(idx - 500, idx + 5000)
  );

  await browser.close();
}

run().catch(console.error);
