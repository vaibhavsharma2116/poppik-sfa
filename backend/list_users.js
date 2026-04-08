const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        role: true
      }
    });
    console.log('Total Users:', users.length);
    console.table(users);
  } catch (err) {
    console.error('Error fetching users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
