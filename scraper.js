const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  await page.goto(
    "https://www.realestate.com.au/buy/in-sydney,+nsw+2000/list-1",
    { waitUntil: "domcontentloaded", timeout: 60000 }
  );

  const html = await page.content();

  console.log("TITLE:", await page.title());
  console.log("HTML LENGTH:", html.length);
  console.log(html.substring(0, 1000));

  await browser.close();
})();
