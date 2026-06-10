const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

const SUBURBS = [
  { name: 'Sydney', state: 'NSW', postcode: '2000' }
];

async function scrapeSuburb(page, suburb) {
  const url = `https://www.realestate.com.au/buy/in-${suburb.name.toLowerCase().replace(/ /g, '-')},+${suburb.state}+${suburb.postcode}/list-1?activeSort=list-date`;
  
  console.log(`Scraping: ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  const listings = await page.evaluate(() => {
    const results = [];
    const cards = document.querySelectorAll('[data-testid="listing-card-wrapper-premiumplus"], [data-testid="listing-card-wrapper-standard"]');
    
    cards.forEach(card => {
      const addressEl = card.querySelector('[data-testid="address-line1"]');
      const suburbEl = card.querySelector('[data-testid="address-line2"]');
      const priceEl = card.querySelector('[data-testid="listing-details__summary-title"]');
      const linkEl = card.querySelector('a[href*="/property-"]');
      const idEl = card.closest('[id]');

      results.push({
        address: addressEl ? addressEl.innerText.trim() : '',
        suburb: suburbEl ? suburbEl.innerText.trim() : '',
        price: priceEl ? priceEl.innerText.trim() : 'Price not disclosed',
        url: linkEl ? 'https://www.realestate.com.au' + linkEl.getAttribute('href') : '',
        listingId: linkEl ? linkEl.getAttribute('href').match(/\d+/) ?. [0] : '' : '',
        dateSeen: new Date().toISOString().split('T')[0]
      });
    });
    
    return results;
  });

  return listings;
}

async function updateSheet(listings) {
  const auth = new JWT({
    email: SERVICE_ACCOUNT.client_email,
    key: SERVICE_ACCOUNT.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID, auth);
  await doc.loadInfo();

  // الشيت الأول للـ listings
  let sheet = doc.sheetsByTitle['Listings'];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: 'Listings',
      headerValues: ['Listing ID', 'Address', 'Suburb', 'Price', 'Date First Seen', 'Last Price', 'Last Checked', 'Status', 'URL']
    });
  }

  await sheet.loadRows();
  const existingRows = sheet.getRows();
  const existingIds = {};
  
  existingRows.forEach(row => {
    existingIds[row.get('Listing ID')] = row;
  });

  const today = new Date().toISOString().split('T')[0];

  for (const listing of listings) {
    if (!listing.listingId) continue;

    if (existingIds[listing.listingId]) {
      // العقار موجود — اتحقق لو السعر اتغير
      const existingRow = existingIds[listing.listingId];
      const oldPrice = existingRow.get('Last Price');
      
      if (oldPrice !== listing.price) {
        // سجّل تغيير السعر
        let priceHistory = doc.sheetsByTitle['Price Changes'];
        if (!priceHistory) {
          priceHistory = await doc.addSheet({
            title: 'Price Changes',
            headerValues: ['Listing ID', 'Address', 'Old Price', 'New Price', 'Date Changed', 'URL']
          });
        }
        await priceHistory.addRow({
          'Listing ID': listing.listingId,
          'Address': listing.address + ', ' + listing.suburb,
          'Old Price': oldPrice,
          'New Price': listing.price,
          'Date Changed': today,
          'URL': listing.url
        });
        
        existingRow.set('Last Price', listing.price);
        existingRow.set('Status', 'Price Changed');
      }
      
      existingRow.set('Last Checked', today);
      existingRow.set('Status', existingRow.get('Status') === 'Price Changed' ? 'Price Changed' : 'Active');
      await existingRow.save();
      
    } else {
      // عقار جديد — أضفه
      await sheet.addRow({
        'Listing ID': listing.listingId,
        'Address': listing.address,
        'Suburb': listing.suburb,
        'Price': listing.price,
        'Date First Seen': today,
        'Last Price': listing.price,
        'Last Checked': today,
        'Status': 'New',
        'URL': listing.url
      });
    }
  }

  // اتحقق من العقارات اللي اتسحبت
  existingRows.forEach(async row => {
    if (row.get('Status') === 'Active' || row.get('Status') === 'New') {
      const stillExists = listings.find(l => l.listingId === row.get('Listing ID'));
      if (!stillExists) {
        row.set('Status', 'Withdrawn');
        await row.save();
      }
    }
  });

  console.log(`Updated ${listings.length} listings in Google Sheets`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  let allListings = [];

  for (const suburb of SUBURBS) {
    const listings = await scrapeSuburb(page, suburb);
    allListings = allListings.concat(listings);
    console.log(`Found ${listings.length} listings in ${suburb.name}`);
  }

  await browser.close();

  if (allListings.length > 0) {
    await updateSheet(allListings);
  } else {
    console.log('No listings found');
  }
}

run().catch(console.error);
