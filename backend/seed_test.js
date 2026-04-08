const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    await prisma.product.create({
      data: {
        name: "Test Product",
        productCode: "TEST001",
        category: "Test",
        price: 100,
        stock: 10,
        gst: 18,
        mrp: 120
      }
    });
    console.log("Seed successful");
  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
