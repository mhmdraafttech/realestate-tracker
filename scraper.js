const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
  });

  await page.setViewportSize({
    width: 1920,
    height: 1080
  });

  console.log("Opening page...");

  await page.goto(
    "https://www.realestate.com.au/buy/in-sydney,+nsw+2000/list-1",
    {
      waitUntil: "domcontentloaded",
      timeout: 120000
    }
  );

  await page.waitForTimeout(15000);

  console.log("TITLE:", await page.title());

  const html = await page.content();
  console.log("HTML LENGTH:", html.length);

  await page.screenshot({
    path: "page.png",
    fullPage: true
  });

  await browser.close();
})();
