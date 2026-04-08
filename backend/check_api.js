const axios = require('axios');

async function checkJson() {
  const SYNC_URL = 'https://poppiklifestyle.com/products.json';
  try {
    const response = await axios.get(SYNC_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Response Status:', response.status);
    console.log('Products found:', response.data.products ? response.data.products.length : 'none');
    if (response.data.products && response.data.products.length > 0) {
      console.log('First Product:', response.data.products[0].title);
    }
  } catch (err) {
    console.error('Error fetching JSON API:', err.message);
  }
}

checkJson();
