const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAttendance() {
  const users = await prisma.user.findMany({
    where: { role: 'sales' },
    include: {
      attendances: {
        orderBy: { timestamp: 'desc' },
        take: 1
      }
    }
  });
  console.log('--- Sales Users Attendance Status ---');
  users.forEach(u => {
    const last = u.attendances[0];
    console.log(`User: ${u.name}, Status: ${last ? last.type : 'NONE'}, Lat: ${last?.latitude}, Lng: ${last?.longitude}`);
  });
  process.exit(0);
}

checkAttendance();
