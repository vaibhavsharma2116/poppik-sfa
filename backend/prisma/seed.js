const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  console.log('--- Seeding Database ---');

  // Clear existing data in correct order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const salesPassword = await bcrypt.hash('sales123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      role: 'admin',
      phone: '9999999999',
      passwordHash: adminPassword,
    },
  });

  const sales = await prisma.user.create({
    data: {
      name: 'Rahul Sharma',
      role: 'sales',
      phone: '8888888888',
      passwordHash: salesPassword,
    },
  });

  // Create Products from real Poppik Lifestyle Catalog
  const products = [
    { 
      name: "POPPIK MATTE LIQUID LIPSTICK - NUDE SHADE", 
      price: 499, 
      image: "https://images.unsplash.com/photo-1586776977607-310e9c725c37?w=800", 
      category: "Cosmetics", 
      stock: 50 
    },
    { 
      name: "POPPIK HYDRATING FACE SERUM - VITAMIN C", 
      price: 899, 
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800", 
      category: "Skincare", 
      stock: 35 
    },
    { 
      name: "POPPIK WATERPROOF EYELINER - DEEP BLACK", 
      price: 349, 
      image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800", 
      category: "Cosmetics", 
      stock: 100 
    },
    { 
      name: "POPPIK GLOW FOUNDATION - NATURAL BEIGE", 
      price: 750, 
      image: "https://images.unsplash.com/photo-1590156221122-c4464ec9570c?w=800", 
      category: "Cosmetics", 
      stock: 25 
    },
    { 
      name: "POPPIK ORGANIC ALOE VERA GEL", 
      price: 250, 
      image: "https://images.unsplash.com/photo-1560365163-3e8d64e762ef?w=800", 
      category: "Skincare", 
      stock: 15 
    },
    { 
      name: "POPPIK ROSE WATER TONER", 
      price: 199, 
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800", 
      category: "Skincare", 
      stock: 40 
    },
    { 
      name: "POPPIK VELVET LIPS - CLASSIC RED", 
      price: 599, 
      image: "https://images.unsplash.com/photo-1586776977607-310e9c725c37?w=800", 
      category: "Cosmetics", 
      stock: 20 
    },
    { 
      name: "POPPIK BRIGHTENING NIGHT CREAM", 
      price: 649, 
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800", 
      category: "Skincare", 
      stock: 30 
    }
  ];

  const createdProducts = [];
  for (const p of products) {
    const cp = await prisma.product.create({ data: p });
    createdProducts.push(cp);
  }

  // Create Outlets with new fields
  const outletsData = [
    { 
      name: "Premium Lifestyle Store", 
      beat_name: "Beat A", 
      area: "Sector 18", 
      city: "Noida", 
      owner_name: "Amit Kumar", 
      owner_no: "9876543210", 
      class: "A_PLUS", 
      gstNumber: "09AAACP1234A1Z1",
      address: "Sector 18, Noida", 
      latitude: 28.567, 
      longitude: 77.321 
    },
    { 
      name: "Modern Home Decor", 
      beat_name: "Beat B", 
      area: "GK-1", 
      city: "Delhi", 
      owner_name: "Suresh Singh", 
      owner_no: "9812345678", 
      class: "A", 
      gstNumber: "07BBBCP5678B1Z2",
      address: "GK-1, Delhi", 
      latitude: 28.549, 
      longitude: 77.234 
    },
    { 
      name: "Luxury Boutique", 
      beat_name: "Beat C", 
      area: "Cyber City", 
      city: "Gurgaon", 
      owner_name: "Vikram Mehta", 
      owner_no: "9900112233", 
      class: "B_PLUS", 
      gstNumber: "06CCCP9012C1Z3",
      address: "Cyber City, Gurgaon", 
      latitude: 28.495, 
      longitude: 77.088 
    },
    { 
      name: "City Center Outlet", 
      beat_name: "Beat D", 
      area: "Mall Road", 
      city: "Shimla", 
      owner_name: "Neeraj Gupta", 
      owner_no: "9412345678", 
      class: "B", 
      gstNumber: "02DDDP3456D1Z4",
      address: "Mall Road, Shimla", 
      latitude: 31.104, 
      longitude: 77.173 
    },
    { 
      name: "Traditional Emporium", 
      beat_name: "Beat E", 
      area: "Johari Bazar", 
      city: "Jaipur", 
      owner_name: "Kamlesh Kumar", 
      owner_no: "9988776655", 
      class: "C_PLUS", 
      gstNumber: "08EEEP7890E1Z5",
      address: "Johari Bazar, Jaipur", 
      latitude: 26.921, 
      longitude: 75.823 
    },
  ];

  const createdOutlets = [];
  for (const o of outletsData) {
    const co = await prisma.outlet.create({ data: o });
    createdOutlets.push(co);
  }

  // Create some attendance records
  await prisma.attendance.create({
    data: {
      userId: sales.id,
      type: 'IN',
      latitude: 26.9124,
      longitude: 75.7873,
    }
  });

  // Create some orders
  await prisma.order.create({
    data: {
      userId: sales.id,
      outletId: createdOutlets[0].id,
      totalAmount: 135,
      orderItems: {
        create: [
          { productId: createdProducts[0].id, quantity: 3, priceAtTime: createdProducts[0].price },
        ]
      }
    }
  });

  await prisma.order.create({
    data: {
      userId: sales.id,
      outletId: createdOutlets[1].id,
      totalAmount: 240,
      orderItems: {
        create: [
          { productId: createdProducts[1].id, quantity: 2, priceAtTime: createdProducts[1].price },
        ]
      }
    }
  });

  console.log('--- Seed data created successfully ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
