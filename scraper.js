const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  await page.goto(
    "https://www.realestate.com.au/buy/in-sydney,+nsw+2000/list-1",
    { waitUntil: "networkidle" }
  );

  await page.screenshot({
    path: "page.png",
    fullPage: true
  });

  console.log(await page.title());

  await browser.close();
})();
