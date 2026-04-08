const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.product.count();
    console.log(`Total products in database: ${count}`);
    if (count > 0) {
      const sample = await prisma.product.findFirst();
      console.log('Sample product:', JSON.stringify(sample, null, 2));
    }
  } catch (err) {
    console.error('Error checking products:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
