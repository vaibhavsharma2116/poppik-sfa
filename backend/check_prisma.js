
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log("Prisma Client:", prisma);
console.log("prisma.user:", prisma.user);
console.log("prisma.refreshToken:", prisma.refreshToken);
console.log("Keys on prisma:", Object.keys(prisma));

async function test() {
  try {
    console.log("Testing user count...");
    const count = await prisma.user.count();
    console.log("User count:", count);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
