const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrders() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: { product: true }
        }
      }
    });

    console.log('Total Orders Found:', orders.length);
    orders.forEach(order => {
      console.log(`Order #${order.id} | Amount: ${order.totalAmount} | Items Count: ${order.orderItems.length}`);
    });
  } catch (err) {
    console.error('Error checking orders:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrders();
