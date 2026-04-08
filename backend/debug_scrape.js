const axios = require('axios');
const cheerio = require('cheerio');

async function debugScrape() {
  console.log('--- Debugging poppiklifestyle.com HTML ---');
  try {
    const res = await axios.get('https://poppiklifestyle.com/collections/all', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(res.data);
    
    // Check for common Shopify selectors
    console.log('Checking selectors:');
    console.log('.grid-product count:', $('.grid-product').length);
    console.log('.product-card count:', $('.product-card').length);
    console.log('.card-wrapper count:', $('.card-wrapper').length);
    console.log('.grid__item count:', $('.grid__item').length);
    
    // Look for product titles
    const titles = [];
    $('h1, h2, h3, .title').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 3) titles.push(text);
    });
    console.log('Sample titles found:', titles.slice(0, 10));

    // Look for prices
    const prices = [];
    $('.price, .money, [data-price]').each((i, el) => {
      prices.push($(el).text().trim());
    });
    console.log('Sample prices found:', prices.slice(0, 10));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

debugScrape();
