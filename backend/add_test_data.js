const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestAttendance() {
  const rahul = await prisma.user.findUnique({ where: { phone: '8888888888' } });
  if (!rahul) {
    console.error('User Rahul Sharma not found');
    return;
  }
  
  await prisma.attendance.create({
    data: {
      userId: rahul.id,
      type: 'IN',
      latitude: 26.9124,
      longitude: 75.7873,
    }
  });
  console.log('Added test IN record for Rahul Sharma');
  process.exit(0);
}

addTestAttendance();
