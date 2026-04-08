const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // 1. Create Shops
  const shops = [
    { name: 'Modern Beauty Care', owner: 'Rahul Sharma', address: 'Shop 12, Sector 18, Noida', latitude: 28.567, longitude: 77.321 },
    { name: 'Poppik Experience Store', owner: 'Priya Singh', address: 'Galleria Market, DLF Phase 4, Gurgaon', latitude: 28.467, longitude: 77.081 },
    { name: 'Glow Cosmetics', owner: 'Amit Patel', address: 'M-Block Market, GK-1, New Delhi', latitude: 28.551, longitude: 77.234 },
    { name: 'The Beauty Hub', owner: 'Sanjay Gupta', address: 'Laxmi Nagar, Main Market, Delhi', latitude: 28.630, longitude: 77.277 }
  ];

  for (const shop of shops) {
    await prisma.shop.create({
      data: shop
    });
  }

  // 2. Create Products
  const products = [
    { name: 'Matte Liquid Lipstick', price: 599, category: 'Cosmetics', image: 'https://images.unsplash.com/photo-1586776977607-310e9c725c37?w=400&h=400&fit=crop' },
    { name: 'Hydrating Face Serum', price: 899, category: 'Skincare', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop' },
    { name: 'Waterproof Eyeliner', price: 349, category: 'Cosmetics', image: 'https://images.unsplash.com/photo-1631214524020-5e18410f5e26?w=400&h=400&fit=crop' },
    { name: 'Vitamin C Day Cream', price: 750, category: 'Skincare', image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop' },
    { name: 'Organic Body Wash', price: 450, category: 'Bath', image: 'https://images.unsplash.com/photo-1559594418-6349c2d1db0a?w=400&h=400&fit=crop' }
  ];

  for (const product of products) {
    await prisma.product.create({
      data: product
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
