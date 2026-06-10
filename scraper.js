const https = require('https');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

function fetchListings(suburb, state, postcode) {
  return new Promise((resolve, reject) => {
    const query = `${suburb}+${state}+${postcode}`;
    const path = `/buy/in-${suburb.toLowerCase()},+${state}+${postcode}/list-1?activeSort=list-date`;

    const options = {
      hostname: 'www.realestate.com.au',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      const encoding = res.headers['content-encoding'];
      
      if (encoding === 'gzip') {
        const zlib = require('zlib');
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        gunzip.on('data', chunk => data += chunk);
        gunzip.on('end', () => resolve({ status: res.statusCode, body: data }));
        gunzip.on('error', reject);
      } else {
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Fetching Sydney listings...');
  
  const result = await fetchListings('sydney', 'NSW', '2000');
  
  console.log('Status:', result.status);
  console.log('Body length:', result.body.length);
  console.log('Has listing data:', result.body.includes('listingId') || result.body.includes('listing-card'));
  
  // نشوف جزء من الـ HTML
  const start = result.body.indexOf('price');
  if (start > -1) {
    console.log('Sample:', result.body.substring(start, start + 500));
  } else {
    console.log('First 1000 chars:', result.body.substring(0, 1000));
  }
}

run().catch(console.error);
