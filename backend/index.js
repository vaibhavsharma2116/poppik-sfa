const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const axios = require('axios');

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Image Proxy to bypass CORS ---
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('URL is required');

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*'
      },
      timeout: 5000 // 5 seconds timeout
    });
    
    const contentType = response.headers['content-type'];
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.send(response.data);
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Proxy error [${error.response.status}]:`, imageUrl);
      
      // If the image is not found (404), return a placeholder instead of an error
      if (error.response.status === 404) {
        return res.redirect('https://placehold.co/400x400/png?text=Image+Not+Found');
      }
      
      return res.status(error.response.status).send(`Error fetching image: ${error.response.statusText}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Proxy error (No response):', error.message);
      return res.status(504).send('No response from image source');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Proxy error (Request setup):', error.message);
      return res.status(500).send('Error proxying image');
    }
  }
});

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.error("No token provided");
    return res.status(401).json({ error: "Access denied" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT Verification Error:", err.message);
      return res.status(403).json({ error: "Invalid token" });
    }
    console.log(`[AUTH] Authenticated User ID: ${user.id}, Role: ${user.role}`);
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin access required" });
  next();
};

// --- Auth APIs ---
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, password, role } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        role: role || 'sales'
      }
    });
    res.status(201).json({ message: "User created successfully", user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: "Phone number already exists" });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, phone: user.phone, createdAt: user.createdAt } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin APIs ---
app.get('/api/admin/live-map', authenticateToken, isAdmin, async (req, res) => {
  try {
    const activeUsers = await prisma.user.findMany({
      where: { 
        role: 'sales',
        latitude: { not: null },
        longitude: { not: null }
      },
      include: {
        attendances: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    const punchedInUsers = activeUsers
      .filter(user => user.attendances.length > 0 && user.attendances[0].type === 'IN')
      .map(user => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        latitude: user.latitude,
        longitude: user.longitude,
        timestamp: user.lastLocationAt || user.attendances[0].timestamp
      }));

    res.json(punchedInUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/sales-analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const productSales = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true
      }
    });

    const products = await prisma.product.findMany({
      where: {
        id: { in: productSales.map(ps => ps.productId) }
      }
    });

    const analytics = productSales.map(ps => {
      const product = products.find(p => p.id === ps.productId);
      return {
        name: product ? product.name : 'Unknown Product',
        totalSold: ps._sum.quantity || 0
      };
    }).sort((a, b) => b.totalSold - a.totalSold).slice(0, 10);

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/inventory-alerts', authenticateToken, isAdmin, async (req, res) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: { lt: 10 } // Alert threshold is 10
      }
    });
    res.json(lowStockProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, phone: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [userCount, orderCount, outletCount] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.outlet.count()
    ]);
    res.json({ userCount, orderCount, outletCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/sales-reports', authenticateToken, isAdmin, async (req, res) => {
  try {
    const reports = await prisma.user.findMany({
      where: { role: 'sales' },
      select: {
        id: true,
        name: true,
        phone: true,
        orders: {
          include: {
            outlet: true,
            orderItems: {
              include: { product: true }
            }
          }
        },
        attendances: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        visits: {
          include: { outlet: true },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    const analyzedReports = reports.map(salesman => {
      const totalRevenue = salesman.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalOrders = salesman.orders.length;
      const totalVisits = salesman.visits.length;
      
      // Combine outlet IDs from both orders and visits to get total unique outlets covered
      const orderOutletIds = salesman.orders.map(o => o.outletId);
      const visitOutletIds = salesman.visits.map(v => v.outletId);
      const uniqueOutlets = new Set([...orderOutletIds, ...visitOutletIds]).size;

      const strikeRate = totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0;
      
      return {
        id: salesman.id,
        name: salesman.name,
        phone: salesman.phone,
        totalRevenue,
        totalOrders,
        totalVisits,
        strikeRate: parseFloat(strikeRate.toFixed(2)),
        uniqueOutlets,
        lastPunch: salesman.attendances[0] || null,
        recentOrders: salesman.orders.slice(-5).map(o => ({
          id: o.id,
          totalAmount: o.totalAmount,
          createdAt: o.createdAt,
          status: o.status,
          outlet: {
            name: o.outlet.name,
            address: o.outlet.address,
            owner_no: o.outlet.owner_no,
            gstNumber: o.outlet.gstNumber
          },
          orderItems: o.orderItems.map(item => ({
            product: {
              name: item.product.name,
              productCode: item.product.productCode,
              boxSize: item.product.boxSize
            },
            quantity: item.quantity,
            priceAtTime: item.priceAtTime
          }))
        })),
        recentVisits: salesman.visits.slice(-5).map(v => ({
          id: v.id,
          outlet: v.outlet ? {
            name: v.outlet.name,
            area: v.outlet.area,
            city: v.outlet.city,
            address: v.outlet.address
          } : null,
          type: v.type,
          reason: v.reason,
          timestamp: v.timestamp,
          latitude: v.latitude,
          longitude: v.longitude
        }))
      };
    });

    res.json(analyzedReports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if user is not deleting themselves
    if (parseInt(id) === req.user.id) return res.status(400).json({ error: "You cannot delete yourself" });

    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products-clear-all', authenticateToken, isAdmin, async (req, res) => {
  try {
    await prisma.orderItem.deleteMany();
    await prisma.product.deleteMany();
    res.json({ message: "All products cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Delete order items associated with this product first
    await prisma.orderItem.deleteMany({ where: { productId: parseInt(id) } });
    await prisma.product.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, price, category, stock, image, productCode, boxSize, hsn, gst, mrp } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        price: parseFloat(price),
        category,
        stock: parseInt(stock),
        image,
        productCode,
        boxSize,
        hsn,
        gst: parseFloat(gst),
        mrp: parseFloat(mrp)
      }
    });
    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/upload-products', authenticateToken, isAdmin, async (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    console.log("Upload failed: No product data received");
    return res.status(400).json({ error: "No product data received" });
  }

  try {
    console.log(`Starting bulk product upload: ${products.length} items`);
    
    // Validate and format data to avoid NaN issues
    const formattedData = products.map(p => {
      const price = parseFloat(p.price || p.rate);
      const stock = parseInt(p.stock || p.qty);
      const mrp = parseFloat(p.mrp);
      const gst = parseFloat(p.gst);
      
      return {
        name: (p.name || `Unnamed Product ${Math.random().toString(36).substr(2, 5)}`).toString(),
        productCode: p.productCode ? p.productCode.toString() : null,
        price: isNaN(price) ? 0 : price,
        category: (p.category || 'General').toString(),
        image: p.image || 'https://placehold.co/400x400/png?text=No+Image',
        stock: isNaN(stock) ? 0 : stock,
        boxSize: p.boxSize ? p.boxSize.toString() : null,
        hsn: p.hsn ? p.hsn.toString() : null,
        gst: isNaN(gst) ? 0 : gst,
        mrp: isNaN(mrp) ? 0 : mrp
      };
    });

    console.log(`Formatted ${formattedData.length} items for database`);

    // Run in a transaction to ensure all or nothing
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete all order items as they depend on products
      await tx.orderItem.deleteMany();
      // 2. Delete all existing products
      await tx.product.deleteMany();
      // 3. Create new products
      return await tx.product.createMany({
        data: formattedData,
        skipDuplicates: true 
      });
    }, {
      timeout: 30000 // Increase timeout for large uploads
    });

    console.log(`Bulk upload successful: ${result.count} products created.`);
    res.json({ message: "Products uploaded successfully", count: result.count });
  } catch (err) {
    console.error("Bulk upload error details:", err);
    res.status(500).json({ error: "Database error during upload: " + err.message });
  }
});

app.put('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, password } = req.body;
  try {
    const updateData = { name, phone, role };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json({ message: "User updated successfully", user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: "Phone number already exists" });
    res.status(500).json({ error: err.message });
  }
});

// --- Notification APIs ---
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/mark-read', authenticateToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Attendance APIs ---
app.get('/api/attendance/status', authenticateToken, async (req, res) => {
  try {
    const lastAttendance = await prisma.attendance.findFirst({
      where: { userId: req.user.id },
      orderBy: { timestamp: 'desc' }
    });
    res.json({ isPunchedIn: lastAttendance?.type === 'IN' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
  const { type, latitude, longitude } = req.body;
  try {
    const [attendance] = await prisma.$transaction([
      prisma.attendance.create({
        data: {
          userId: req.user.id,
          type, // IN or OUT
          latitude,
          longitude
        }
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: {
          latitude: type === 'IN' ? latitude : null,
          longitude: type === 'IN' ? longitude : null,
          lastLocationAt: type === 'IN' ? new Date() : null
        }
      }),
      // Create Notification for punch in/out
      prisma.notification.create({
        data: {
          userId: req.user.id,
          title: type === 'IN' ? 'Punch-In Successful' : 'Punch-Out Successful',
          message: type === 'IN' ? 'Your attendance has been recorded for today.' : 'Work day ended. See you tomorrow!',
          type: 'attendance'
        }
      })
    ]);
    res.status(201).json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/update-location', authenticateToken, async (req, res) => {
  const { latitude, longitude } = req.body;
  try {
    // Check if user is punched in
    const lastAttendance = await prisma.attendance.findFirst({
      where: { userId: req.user.id },
      orderBy: { timestamp: 'desc' }
    });

    if (lastAttendance?.type !== 'IN') {
      return res.status(400).json({ error: "User not punched in" });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        latitude,
        longitude,
        lastLocationAt: new Date()
      }
    });
    res.json({ message: "Location updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Product APIs ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Outlet APIs ---
app.get('/api/outlets', authenticateToken, async (req, res) => {
  try {
    const where = {};
    // If user is not admin, only show their own outlets
    if (req.user.role !== 'admin') {
      where.userId = req.user.id;
    }
    
    const outlets = await prisma.outlet.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(outlets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/outlets', authenticateToken, async (req, res) => {
  const { name, beat_name, area, city, owner_name, owner_no, class: outletClass, address, latitude, longitude, gstNumber } = req.body;
  try {
    const outlet = await prisma.outlet.create({
      data: { 
        name, 
        beat_name, 
        area, 
        city, 
        owner_name, 
        owner_no, 
        class: outletClass, 
        address, 
        latitude, 
        longitude, 
        gstNumber,
        userId: req.user.id // Link outlet to the salesperson
      }
    });
    res.status(201).json(outlet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Leave APIs ---
app.post('/api/leaves', authenticateToken, async (req, res) => {
  const { startDate, endDate, reason } = req.body;
  try {
    const leave = await prisma.leave.create({
      data: {
        userId: req.user.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: 'Pending'
      }
    });
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaves', authenticateToken, async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin view for leaves
app.get('/api/admin/leaves', authenticateToken, isAdmin, async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/leaves/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const leave = await prisma.leave.update({
      where: { id: parseInt(id) },
      data: { status }
    });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Order APIs ---
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { outletId, totalAmount, items } = req.body;
  try {
    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          userId: req.user.id,
          outletId: parseInt(outletId),
          totalAmount: parseFloat(totalAmount),
          orderItems: {
            create: items.map(item => ({
              productId: parseInt(item.productId),
              quantity: parseInt(item.quantity),
              priceAtTime: parseFloat(item.price)
            }))
          }
        },
        include: { 
          outlet: true,
          orderItems: { 
            include: { product: true } 
          } 
        }
      }),
      // Create Notification for new order
      prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'New Order Confirmed',
          message: `Order for ₹${totalAmount} has been successfully placed.`,
          type: 'order'
        }
      })
    ]);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { outlet: true, orderItems: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Visit APIs ---
app.post('/api/visits', authenticateToken, async (req, res) => {
  const { outletId, type, reason, latitude, longitude } = req.body;
  try {
    const visit = await prisma.visit.create({
      data: {
        userId: req.user.id,
        outletId: parseInt(outletId),
        type, // ORDER or NO_ORDER
        reason,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        timestamp: new Date()
      }
    });
    res.status(201).json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/visits', authenticateToken, async (req, res) => {
  try {
    const visits = await prisma.visit.findMany({
      where: { userId: req.user.id },
      include: { outlet: true },
      orderBy: { timestamp: 'desc' }
    });
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Reporting APIs ---
app.get('/api/reports/summary', authenticateToken, async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    console.log(`[REPORTS] ${period}-wise summary requested by User ID: ${req.user.id}`);
    
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === 'month') {
      startDate.setDate(1); // First day of current month
    } else if (period === 'year') {
      startDate.setMonth(0, 1); // January 1st of current year
    }

    const [attendances, orders, visits] = await Promise.all([
      prisma.attendance.count({
        where: {
          userId: req.user.id,
          timestamp: { gte: startDate }
        }
      }),
      prisma.order.count({
        where: {
          userId: req.user.id,
          createdAt: { gte: startDate }
        }
      }),
      prisma.visit.count({
        where: {
          userId: req.user.id,
          timestamp: { gte: startDate }
        }
      })
    ]);

    const ordersSum = await prisma.order.aggregate({
      where: {
        userId: req.user.id,
        createdAt: { gte: startDate }
      },
      _sum: { totalAmount: true }
    });

    const strikeRate = visits > 0 ? (orders / visits) * 100 : 0;

    console.log(`[REPORTS] ${period}-wise results for User ${req.user.id}: Attendances=${attendances}, Sales=${ordersSum._sum.totalAmount || 0}, Visits=${visits}, Orders=${orders}`);

    res.json({
      totalAttendance: attendances,
      totalSalesValue: ordersSum._sum.totalAmount || 0,
      totalVisits: visits,
      totalOrders: orders,
      strikeRate: parseFloat(strikeRate.toFixed(2))
    });
  } catch (err) {
    console.error("[REPORTS] Error in summary API:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/day-wise', authenticateToken, async (req, res) => {
  // Keeping this for backward compatibility if any other part uses it
  // But we will primarily use /api/reports/summary
  res.redirect(`/api/reports/summary?period=day`);
});

app.get('/api/reports/party-wise', authenticateToken, async (req, res) => {
  try {
    console.log(`[REPORTS] Party-wise report requested by User ID: ${req.user.id}`);
    
    // Debug: Count all orders in DB
    const allOrdersCount = await prisma.order.count();
    console.log(`[REPORTS] Total orders in DB: ${allOrdersCount}`);

    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { 
        outlet: {
          include: {
            visits: {
              where: { userId: req.user.id },
              orderBy: { timestamp: 'desc' }
            }
          }
        },
        orderItems: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[REPORTS] Found ${orders.length} orders for User ID: ${req.user.id}`);

    const partyWiseData = orders.reduce((acc, order) => {
      if (!order.outlet) return acc;
      const outletName = order.outlet.name;
      if (!acc[outletName]) {
        acc[outletName] = { 
          totalOrders: 0, 
          totalAmount: 0, 
          orders: [],
          visits: (order.outlet.visits || []).map(v => ({
            id: v.id,
            type: v.type,
            reason: v.reason,
            timestamp: v.timestamp,
            latitude: v.latitude,
            longitude: v.longitude
          }))
        };
      }
      
      const mappedOrder = {
        id: order.id,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        status: order.status,
        outlet: {
          id: order.outlet.id,
          name: order.outlet.name,
          address: order.outlet.address,
          owner_no: order.outlet.owner_no,
          gstNumber: order.outlet.gstNumber
        },
        orderItems: (order.orderItems || []).map(item => ({
          id: item.id,
          quantity: item.quantity,
          priceAtTime: item.priceAtTime,
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            productCode: item.product.productCode,
            boxSize: item.product.boxSize,
            price: item.product.price
          } : null
        })),
        items: (order.orderItems || []).map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.priceAtTime
        }))
      };

      acc[outletName].totalOrders += 1;
      acc[outletName].totalAmount += order.totalAmount;
      acc[outletName].orders.push(mappedOrder);
      
      return acc;
    }, {});

    res.json({
      _timestamp: new Date().getTime(),
      _count: orders.length,
      data: partyWiseData
    });
  } catch (err) {
    console.error("[REPORTS] Error in party-wise API:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/location-wise', authenticateToken, async (req, res) => {
  try {
    console.log(`[REPORTS] Location-wise report requested by User ID: ${req.user.id}`);
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { 
        outlet: true,
        orderItems: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[REPORTS] Found ${orders.length} orders for location-wise report.`);

    const locationWiseData = orders.reduce((acc, order) => {
      if (!order.outlet) return acc;
      const location = order.outlet.area || order.outlet.city || 'Unknown Location';
      if (!acc[location]) {
        acc[location] = { 
          totalOrders: 0, 
          totalAmount: 0,
          uniqueParties: new Set(),
          orders: []
        };
      }
      
      const mappedOrder = {
        id: order.id,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        status: order.status,
        outlet: {
          id: order.outlet.id,
          name: order.outlet.name,
          address: order.outlet.address,
          owner_no: order.outlet.owner_no,
          gstNumber: order.outlet.gstNumber
        },
        orderItems: (order.orderItems || []).map(item => ({
          id: item.id,
          quantity: item.quantity,
          priceAtTime: item.priceAtTime,
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            productCode: item.product.productCode,
            boxSize: item.product.boxSize,
            price: item.product.price
          } : null
        })),
        items: (order.orderItems || []).map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.priceAtTime
        }))
      };

      acc[location].totalOrders += 1;
      acc[location].totalAmount += order.totalAmount;
      acc[location].uniqueParties.add(order.outletId);
      acc[location].orders.push(mappedOrder);
      return acc;
    }, {});

    const finalData = {};
    Object.keys(locationWiseData).forEach(loc => {
      finalData[loc] = {
        totalOrders: locationWiseData[loc].totalOrders,
        totalAmount: locationWiseData[loc].totalAmount,
        uniquePartiesCount: locationWiseData[loc].uniqueParties.size,
        orders: locationWiseData[loc].orders
      };
    });

    console.log(`[REPORTS] Sending location-wise data for ${Object.keys(finalData).length} locations.`);
    res.json(finalData);
  } catch (err) {
    console.error("[REPORTS] Error in location-wise API:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/product-wise', authenticateToken, async (req, res) => {
  try {
    console.log(`[REPORTS] Product-wise report requested by User ID: ${req.user.id}`);
    const orderItems = await prisma.orderItem.findMany({
      where: { 
        order: { userId: req.user.id } 
      },
      include: { 
        product: true 
      }
    });

    console.log(`[REPORTS] Found ${orderItems.length} order items for product-wise report.`);

    const productWiseData = orderItems.reduce((acc, item) => {
      if (!item.product) return acc;
      const productName = item.product.name;
      if (!acc[productName]) {
        acc[productName] = { 
          totalQuantity: 0, 
          totalRevenue: 0,
          category: item.product.category,
          productCode: item.product.productCode
        };
      }
      
      acc[productName].totalQuantity += item.quantity;
      acc[productName].totalRevenue += (item.quantity * item.priceAtTime);
      return acc;
    }, {});

    console.log(`[REPORTS] Sending product-wise data for ${Object.keys(productWiseData).length} products.`);
    res.json(productWiseData);
  } catch (err) {
    console.error("[REPORTS] Error in product-wise API:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Poppik SFA Server running on port ${PORT}`);
});

// Keep process alive
setInterval(() => {}, 1000000);

process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});
