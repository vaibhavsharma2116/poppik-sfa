const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    await prisma.product.deleteMany({ where: { name: "Test Product" } });
    console.log("Cleanup successful");
  } catch (err) {
    console.error("Cleanup failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
