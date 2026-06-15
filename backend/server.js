require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const prisma = new PrismaClient();
const app = express();

app.use(helmet());

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Basic XSS Sanitization Middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
    }
  }
  next();
};
app.use(sanitizeInput);

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use('/api/', globalLimiter);

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register requests per windowMs
  message: { error: "Too many login/register attempts, please try again later" }
});
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);

app.get('/', (req, res) => {
  res.send('ShipX Backend API is running!');
});

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-mvp-key-123';

// ---------------------------------------------------------
// AUTHENTICATION ROUTES
// ---------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { 
      email, password, name, role, phoneNumber, 
      businessName, category, lat, lng, businessPhone, photoUrl 
    } = req.body;
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let user;
    
    if (role === 'BUSINESS') {
      // Create user and place in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            phoneNumber,
            role: 'BUSINESS'
          }
        });

        await tx.place.create({
          data: {
            name: businessName,
            category: category || 'Restaurant',
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            phoneNumber: businessPhone,
            photoUrl,
            ownerId: newUser.id
          }
        });

        return newUser;
      });
      user = result;
    } else {
      // Create consumer
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phoneNumber,
          role: 'CONSUMER'
        }
      });
    }
    
    // Create Welcome Notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Welcome to Placess!',
        message: 'Your account has been created successfully. Explore the map to find great offers nearby.',
        type: 'SYSTEM'
      }
    });

    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, include: { places: true } });
    const { password: pw, preferences: prefsStr, ...userWithoutPassword } = fullUser;
    let parsedPreferences = {};
    try { if (prefsStr) parsedPreferences = JSON.parse(prefsStr); } catch (e) {}
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { ...userWithoutPassword, preferences: parsedPreferences } });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email }, include: { places: true } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const { password: pw, preferences: prefsStr, ...userWithoutPassword } = user;
    let parsedPreferences = {};
    try { if (prefsStr) parsedPreferences = JSON.parse(prefsStr); } catch (e) {}

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { ...userWithoutPassword, preferences: parsedPreferences } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware for protected routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ---------------------------------------------------------
// CONSUMER ROUTES (Map & Live Campaigns)
// ---------------------------------------------------------
app.get('/api/places', async (req, res) => {
  try {
    const places = await prisma.place.findMany({
      include: {
        campaigns: {
          where: { isActive: true }
        },
        reviews: {
          include: { user: { select: { name: true, initials: true, photoUrl: true } } },
          orderBy: { createdAt: 'desc' }
        },
        menuItems: true
      }
    });
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/places/:id', async (req, res) => {
  try {
    const place = await prisma.place.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        menuItems: { where: { available: true } },
        campaigns: { where: { isActive: true } },
        reviews: {
          include: { user: { select: { name: true, initials: true, photoUrl: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    res.json(place);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update a review
app.post('/api/places/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const placeId = parseInt(req.params.id);
    const userId = req.user.id;

    const existingReview = await prisma.review.findFirst({
      where: { userId, placeId }
    });

    let review;
    if (existingReview) {
      review = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating: parseInt(rating),
          comment
        },
        include: {
          user: { select: { name: true, initials: true, photoUrl: true } }
        }
      });
    } else {
      review = await prisma.review.create({
        data: {
          rating: parseInt(rating),
          comment,
          userId,
          placeId
        },
        include: {
          user: { select: { name: true, initials: true, photoUrl: true } }
        }
      });
    }
    res.json(review);
  } catch (err) {
    console.error("Failed to submit review", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { places: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { password, preferences: prefsStr, ...userWithoutPassword } = user;
    
    let parsedPreferences = {};
    try {
      if (prefsStr) {
        parsedPreferences = JSON.parse(prefsStr);
      }
    } catch (e) {
      console.error("Failed to parse preferences", e);
    }
    
    res.json({ ...userWithoutPassword, preferences: parsedPreferences });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const updated = await prisma.notification.updateMany({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: parseInt(req.params.id), userId: req.user.id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update current user
app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { name, email, phoneNumber, photoUrl, initials, preferences } = req.body;
    
    // Check if new email is already taken by someone else
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: req.user.id } }
      });
      if (existing) return res.status(400).json({ error: 'Email is already in use' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(initials !== undefined && { initials }),
        ...(preferences !== undefined && { preferences: JSON.stringify(preferences) }),
      },
      include: { places: true }
    });

    if (preferences !== undefined) {
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Alerts Updated',
          message: 'Your alert preferences have been successfully updated.',
          type: 'ALERT'
        }
      });
    }
    
    const { password, preferences: prefsStr, ...userWithoutPassword } = updatedUser;
    let parsedPreferences = {};
    try { if (prefsStr) parsedPreferences = JSON.parse(prefsStr); } catch (e) {}
    
    res.json({ ...userWithoutPassword, preferences: parsedPreferences });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete current user
app.delete('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // Delete consumer orders
    await prisma.order.deleteMany({ where: { userId: req.user.id } });
    
    // If business owner, delete their places and related data
    const places = await prisma.place.findMany({ where: { ownerId: req.user.id } });
    for (const place of places) {
      await prisma.menuItem.deleteMany({ where: { placeId: place.id } });
      await prisma.campaign.deleteMany({ where: { placeId: place.id } });
      await prisma.order.deleteMany({ where: { placeId: place.id } });
      await prisma.place.delete({ where: { id: place.id } });
    }

    // Delete the user
    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password
app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------
// BUSINESS ROUTES (Menu & Orders)
// ---------------------------------------------------------

// Get my places (for a business owner)
app.get('/api/business/places', authenticateToken, async (req, res) => {
  try {
    const places = await prisma.place.findMany({
      where: { ownerId: req.user.id },
      include: {
        menuItems: true,
        campaigns: true,
        orders: true,
        reviews: {
          include: { user: { select: { name: true, initials: true, photoUrl: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new place
app.post('/api/business/places', authenticateToken, async (req, res) => {
  try {
    const { name, category, lat, lng } = req.body;
    const newPlace = await prisma.place.create({
      data: {
        name,
        category,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        ownerId: req.user.id
      }
    });
    res.json(newPlace);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a place (Full Profile Edit)
app.put('/api/business/places/:id', authenticateToken, async (req, res) => {
  try {
    const { name, category, photoUrl, phoneNumber, takeAwayEnabled } = req.body;
    
    // First find the place to ensure it exists and belongs to owner
    const placeId = parseInt(req.params.id);
    const place = await prisma.place.findUnique({ where: { id: placeId } });
    if (!place || place.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.place.update({
      where: { id: placeId },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(takeAwayEnabled !== undefined && { takeAwayEnabled }),
        ...(req.body.capacity !== undefined && { capacity: req.body.capacity })
      }
    });
    res.json({ success: true, updated });
  } catch (err) {
    console.error("Failed to update place", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a Campaign
app.post('/api/business/campaigns', authenticateToken, async (req, res) => {
  try {
    const { type, title, description, placeId } = req.body;
    
    // Verify owner
    const place = await prisma.place.findUnique({ where: { id: parseInt(placeId) }});
    if (!place || place.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        type,
        title,
        description,
        placeId: parseInt(placeId)
      }
    });

    // Notify all consumers about the new campaign
    const consumers = await prisma.user.findMany({ where: { role: 'CONSUMER' } });
    if (consumers.length > 0) {
      const notifs = consumers.map(c => ({
        userId: c.id,
        title: `Live Offer: ${title}`,
        message: `${place.name} has a new live offer: ${description}`,
        type: 'OFFER'
      }));
      await prisma.notification.createMany({ data: notifs });
    }

    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Calculate Potential Reach for Broadcast
app.get('/api/business/reach', authenticateToken, async (req, res) => {
  try {
    const radius = parseInt(req.query.radius) || 500;
    const totalConsumers = await prisma.user.count({ where: { role: 'CONSUMER' } });
    
    // Simulate reach based on radius and actual consumer count
    // (In the future, this will use PostGIS or Haversine on active user coordinates)
    const baseDensity = Math.floor(radius / 40); // e.g. 500m -> 12 people
    const potentialReach = baseDensity + (totalConsumers * Math.ceil(radius / 1000));
    
    res.json({ reach: potentialReach });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Increment Campaign Clicks (Leads)
app.post('/api/campaigns/:id/click', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { clicks: { increment: 1 } }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Increment Campaign Conversions (Recovering Clients)
app.post('/api/campaigns/:id/convert', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { conversions: { increment: 1 } }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a menu item
app.post('/api/business/menu', authenticateToken, async (req, res) => {
  try {
    const { title, description, price, image, placeId } = req.body;
    const item = await prisma.menuItem.create({
      data: { title, description, price: parseFloat(price), image, placeId: parseInt(placeId) }
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle Menu Item availability
app.put('/api/business/menu/:id', authenticateToken, async (req, res) => {
  try {
    const { available } = req.body;
    const item = await prisma.menuItem.update({
      where: { id: parseInt(req.params.id) },
      data: { available }
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Setup Business Profile
app.post('/api/business/setup', authenticateToken, async (req, res) => {
  try {
    const { name, category, lat, lng, phoneNumber, address } = req.body;
    
    // Create the business place
    const place = await prisma.place.create({
      data: {
        name,
        category,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        phoneNumber: phoneNumber || null,
        ownerId: req.user.id,
        takeAwayEnabled: true
      }
    });
    
    // Upgrade user role to BUSINESS
    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: 'BUSINESS' }
    });

    res.json({ success: true, place });
  } catch (err) {
    console.error("Business setup error", err);
    res.status(500).json({ error: 'Failed to setup business' });
  }
});

// Update Order Status
app.put('/api/business/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Verify owner
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { place: true } });
    if (!order || order.place.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});

// Triggered restart 2
