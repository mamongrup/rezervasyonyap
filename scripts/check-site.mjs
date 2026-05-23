import https from 'https';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  // API'yi dene
  const urls = [
    'https://www.rezervasyonyap.com.tr/api/space/search?s=&lat=&lng=&location_id=&pickup_date=&dropoff_date=&pickup_time=&dropoff_time=&adults=1&children=0&infants=0&page=1',
    'https://www.rezervasyonyap.com.tr/api/space/search',
  ];
  
  for (const url of urls) {
    try {
      console.log(`\n=== ${url} ===`);
      const result = await fetch(url);
      console.log('Status:', result.status);
      console.log('Content:', result.data.substring(0, 5000));
    } catch (e) {
      console.log(`HATA (${url}):`, e.message);
    }
  }
}

main();
