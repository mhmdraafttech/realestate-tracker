import { chromium } from "playwright";

console.log("START");

async function scrape() {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  await page.goto(
    "https://www.realestate.com.au/buy/in-sydney,+nsw+2000/list-1",
    {
      waitUntil: "domcontentloaded"
    }
  );

  console.log("TITLE:");
  console.log(await page.title());

  console.log("URL:");
  console.log(page.url());

  await browser.close();
}

scrape()
  .then(() => console.log("DONE"))
  .catch(err => {
    console.error("ERROR:");
    console.error(err);
  });
