const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsersAndOrders() {
  try {
    const users = await prisma.user.findMany();
    console.log('Users found:', users.map(u => ({ id: u.id, name: u.name, role: u.role })));

    const orders = await prisma.order.findMany({
      include: {
        user: true,
        orderItems: true
      }
    });

    console.log('Orders with their users:');
    orders.forEach(o => {
      console.log(`Order #${o.id} | User: ${o.user.name} (ID: ${o.user.id}) | Items: ${o.orderItems.length}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsersAndOrders();
