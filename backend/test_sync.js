const { syncProducts } = require('./syncProducts');

async function testSync() {
  console.log('--- Testing Product Sync Manually ---');
  const result = await syncProducts();
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

testSync();
