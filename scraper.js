import { chromium } from "playwright";

async function scrape() {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  await page.goto(
    "https://www.realestate.com.au/buy/in-sydney,+nsw+2000/list-1",
    {
      waitUntil: "networkidle"
    }
  );

  console.log(await page.title());

  await browser.close();
}

scrape();
