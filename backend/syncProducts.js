const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SYNC_URL = 'https://poppiklifestyle.com/products.json';

async function syncProducts() {
  console.log('--- Starting Product Sync from poppiklifestyle.com ---');
  try {
    // 1. Try fetching the products.json (Standard Shopify endpoint)
    let products = [];
    try {
      const response = await axios.get(SYNC_URL, {
        timeout: 10000, // 10 seconds timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (response.data && response.data.products && response.data.products.length > 0) {
        products = response.data.products.map(p => ({
          name: p.title,
          price: parseFloat(p.variants[0].price),
          category: p.product_type || 'Cosmetics',
          image: p.images[0]?.src || 'https://placehold.co/200',
          stock: p.variants[0].inventory_quantity > 0 ? p.variants[0].inventory_quantity : 10 
        }));
        console.log(`Found ${products.length} products via JSON API.`);
      } else {
        console.log('JSON API returned empty products list.');
      }
    } catch (apiErr) {
      console.log(`JSON API failed (${apiErr.message}), falling back to HTML scraping...`);
    }

    // 2. Real Website Product Data (as per Poppik Lifestyle)
    // Disabled as per user request to use manual Excel listing.
    if (products.length === 0) {
      console.log('Skipping fallback sync as per manual control request.');
      return { success: true, count: 0 };
    }

    // 3. Optional: Mark old products that are not in the current sync list as inactive
    // (Skipping deletion due to foreign key constraints on existing orders)
    const productNames = products.map(p => p.name);
    // For now, we'll just keep them to preserve order history.

    let updatedCount = 0;
    for (const p of products) {
      try {
        await prisma.product.upsert({
          where: { name: p.name }, // Assuming name is unique or used as identifier
          update: {
            price: p.price,
            category: p.category,
            image: p.image.startsWith('//') ? `https:${p.image}` : p.image,
            // We don't overwrite stock if it already exists, unless it's a new product
          },
          create: {
            name: p.name,
            price: p.price,
            category: p.category,
            image: p.image.startsWith('//') ? `https:${p.image}` : p.image,
            stock: p.stock
          }
        });
        updatedCount++;
      } catch (dbErr) {
        console.error(`Failed to upsert product: ${p.name}`, dbErr.message);
      }
    }

    console.log(`--- Sync Complete. Updated ${updatedCount} products. ---`);
    return { success: true, count: updatedCount };

  } catch (error) {
    console.error('Critical Error during product sync:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { syncProducts };
