const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  const phone = '9999999999';
  const password = 'admin';
  const name = 'Admin User';
  const role = 'admin';

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        role
      }
    });
    console.log('Admin user created successfully!');
    console.log('Phone:', phone);
    console.log('Password:', password);
  } catch (err) {
    if (err.code === 'P2002') {
      console.log('Admin user with this phone number already exists.');
    } else {
      console.error('Error creating admin user:', err);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
