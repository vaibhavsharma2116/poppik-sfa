
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Testing refreshToken...");
    const count = await prisma.refreshToken.count();
    console.log("refreshToken count:", count);
  } catch (err) {
    console.error("Error testing refreshToken:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
