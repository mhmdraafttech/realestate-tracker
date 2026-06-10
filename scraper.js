const https = require('https');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

const SUBURBS = [
  { name: 'sydney', state: 'NSW', postcode: '2000' }
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `http://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodedUrl}&render=true`;
    
    const options = {
      hostname: 'api.scraperapi.com',
      path: `/?api_key=${SCRAPER_API_KEY}&url=${encodedUrl}&render=true`,
      method: 'GET',
      timeout: 60000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

function parseListings(html) {
  const listings = [];
  
  // استخراج البيانات من الـ JSON المدمج في الصفحة
  const jsonMatch = html.match(/window\.__NEXT_DATA__\s*=\s*(\{.+?\});<\/script>/s) ||
                    html.match(/window\.__data__\s*=\s*(\{.+?\});<\/script>/s);
  
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const props = data?.props?.pageProps;
      
      // محاولة إيجاد الـ listings في أي مكان في الـ JSON
      const searchStr = JSON.stringify(data);
      const listingMatches = searchStr.match(/"listingId":"(\d+)"/g) || [];
      
      listingMatches.forEach(match => {
        const id = match.match(/"listingId":"(\d+)"/)[1];
        if (!listings.find(l => l.listingId === id)) {
          listings.push({ listingId: id });
        }
      });
      
      console.log(`Found ${listings.length} listing IDs in JSON data`);
    } catch(e) {
      console.log('JSON parse error:', e.message);
    }
  }

  // استخراج من الـ HTML مباشرة لو الـ JSON ما اشتغلش
  if (listings.length === 0) {
    const priceMatches = html.match(/data-testid="listing-details__summary-title"[^>]*>([^<]+)</g) || [];
    const addressMatches = html.match(/data-testid="address-line1"[^>]*>([^<]+)</g) || [];
    
    console.log(`HTML method: ${priceMatches.length} prices, ${addressMatches.length} addresses`);
    
    for (let i = 0; i < Math.max(priceMatches.length, addressMatches.length); i++) {
      listings.push({
        listingId: `unknown-${i}`,
        price: priceMatches[i] ? priceMatches[i].replace(/.*>/, '') : 'N/A',
        address: addressMatches[i] ? addressMatches[i].replace(/.*>/, '') : 'N/A',
      });
    }
  }

  return listings;
}

async function updateSheet(listings) {
  if (listings.length === 0) return;

  const auth = new JWT({
    email: SERVICE_ACCOUNT.client_email,
    key: SERVICE_ACCOUNT.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID, auth);
  await doc.loadInfo();

  let sheet = doc.sheetsByTitle['Listings'];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: 'Listings',
      headerValues: ['Listing ID', 'Address', 'Suburb', 'Price', 'Date First Seen', 'Last Price', 'Last Checked', 'Status', 'URL']
    });
  }

  await sheet.loadRows();
  const rows = await sheet.getRows();
  const existingIds = {};
  rows.forEach(row => {
    existingIds[row.get('Listing ID')] = row;
  });

  const today = new Date().toISOString().split('T')[0];
  let added = 0;
  let updated = 0;

  for (const listing of listings) {
    if (!listing.listingId) continue;

    if (existingIds[listing.listingId]) {
      const row = existingIds[listing.listingId];
      const oldPrice = row.get('Last Price');

      if (listing.price && oldPrice !== listing.price) {
        let priceSheet = doc.sheetsByTitle['Price Changes'];
        if (!priceSheet) {
          priceSheet = await doc.addSheet({
            title: 'Price Changes',
            headerValues: ['Listing ID', 'Address', 'Old Price', 'New Price', 'Date Changed', 'URL']
          });
        }
        await priceSheet.addRow({
          'Listing ID': listing.listingId,
          'Address': listing.address || '',
          'Old Price': oldPrice,
          'New Price': listing.price,
          'Date Changed': today,
          'URL': listing.url || ''
        });
        row.set('Last Price', listing.price);
        row.set('Status', 'Price Changed');
        updated++;
      }

      row.set('Last Checked', today);
      await row.save();

    } else {
      await sheet.addRow({
        'Listing ID': listing.listingId,
        'Address': listing.address || '',
        'Suburb': listing.suburb || '',
        'Price': listing.price || '',
        'Date First Seen': today,
        'Last Price': listing.price || '',
        'Last Checked': today,
        'Status': 'New',
        'URL': listing.url || ''
      });
      added++;
    }
  }

  // العقارات اللي اتسحبت
  for (const row of rows) {
    const status = row.get('Status');
    if (status === 'Active' || status === 'New') {
      const stillExists = listings.find(l => l.listingId === row.get('Listing ID'));
      if (!stillExists) {
        row.set('Status', 'Withdrawn');
        await row.save();
      }
    }
  }

  console.log(`Done — Added: ${added}, Price changes: ${updated}`);
}

async function run() {
  for (const suburb of SUBURBS) {
    const url = `https://www.realestate.com.au/buy/in-${suburb.name},+${suburb.state}+${suburb.postcode}/list-1?activeSort=list-date`;
    console.log(`Fetching: ${url}`);

    const result = await fetchPage(url);
    console.log(`Status: ${result.status}, Body length: ${result.body.length}`);

    if (result.body.length < 1000) {
      console.log('Body too short, possible block:', result.body.substring(0, 500));
      continue;
    }

    const listings = parseListings(result.body);
    console.log(`Parsed ${listings.length} listings`);

    await updateSheet(listings);
  }
}

run().catch(console.error);
