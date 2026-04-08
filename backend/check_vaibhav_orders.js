const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('All Users:', users.map(u => ({ id: u.id, name: u.name, phone: u.phone })));
  
  const vaibhav = users.find(u => u.name.toLowerCase().includes('vaibhav'));
  if (vaibhav) {
    console.log('Found Vaibhav with ID:', vaibhav.id);
    const orders = await prisma.order.findMany({ where: { userId: vaibhav.id } });
    console.log('Orders for Vaibhav:', orders.length);
  } else {
    console.log('Vaibhav not found in DB');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
