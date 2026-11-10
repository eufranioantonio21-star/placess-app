require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { prisma } = require('./lib/prisma');
const { supabaseAdmin, verifyAccessToken } = require('./lib/supabase-auth');
const { isValidSpotCategory } = require('./lib/categories');
const { parseReviewInput } = require('./lib/reviews');
const { parseCampaignInput } = require('./lib/campaigns');
const { recordCampaignClick } = require('./lib/campaign-clicks');
const { createCorsOriginGuard } = require('./lib/cors-origins');
const { normalisePermissions, resolvePlaceAccess } = require('./lib/place-access');
const { parsePreferences } = require('./lib/preferences');
const { classifyCampaignPosition, parseLocationSample } = require('./lib/geofencing');
const {
  isApprovedImageUrl,
  isApprovedProfileImage,
  parseCoordinates,
  parseMenuItem,
  parseAvailability,
} = require('./lib/management-input');
const { BUSINESS_TRANSITIONS, canBusinessTransition, parseOrderRequest, parseOrderStatus } = require('./lib/orders');
const {
  AccountDeletionError,
  deleteAccountAtomically,
  reconcilePendingAccountDeletions,
} = require('./lib/account-deletion');

const app = express();

app.use(helmet());

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? createCorsOriginGuard(process.env.FRONTEND_URL)
    : '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Apply the IP budget before parsing bodies so oversized or malformed requests
// do not consume parser work before the request is rejected.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiados pedidos. Tenta novamente dentro de 15 minutos.' }
});
app.use('/api/', globalLimiter);
app.use(express.json({ limit: '2mb' }));

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

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register requests per windowMs
  message: { error: 'Demasiadas tentativas de autenticação. Tenta novamente mais tarde.' }
});
app.use('/api/auth/profile', authLimiter);

app.get('/', (req, res) => {
  res.send('A API da SPOTS está activa');
});

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

// ---------------------------------------------------------
// AUTHENTICATION ROUTES
// ---------------------------------------------------------
const readBearerToken = (req) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  return scheme === 'Bearer' ? token : null;
};

const authenticateSupabaseToken = async (req, res, next) => {
  try {
    const token = readBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Autenticação necessária' });

    const claims = await verifyAccessToken(token);
    const sessionId = claims.session_id;

    if (sessionId) {
      const revoked = await prisma.revokedSession.findUnique({ where: { id: sessionId } });
      if (revoked) return res.status(401).json({ error: 'Sessão terminada' });
    }

    req.accessToken = token;
    req.auth = {
      userId: claims.sub,
      email: claims.email,
      sessionId,
      expiresAt: claims.exp,
    };
    next();
  } catch (error) {
    console.warn('Authentication rejected:', error.message);
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
};

const authenticateToken = [authenticateSupabaseToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { authUserId: req.auth.userId },
      select: { id: true, role: true, authUserId: true, deletionRequestedAt: true },
    });
    if (!user) return res.status(401).json({ error: 'Perfil SPOTS não encontrado' });
    if (user.deletionRequestedAt) {
      return res.status(410).json({ error: 'A eliminação desta conta está em curso' });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}];

const requireBusiness = (req, res, next) => {
  if (req.user.role !== 'BUSINESS') return res.status(403).json({ error: 'Conta negócio necessária' });
  next();
};
const businessOnly = [...authenticateToken, requireBusiness];

const getPlaceAccess = async (placeId, userId) => {
  if (!Number.isInteger(placeId) || placeId <= 0) return { place: null, access: null };
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    include: { staffMemberships: { where: { userId } } },
  });
  return { place, access: resolvePlaceAccess(place, userId) };
};

const canUsePlace = (access, permission) => Boolean(access?.isOwner || access?.[permission]);

const presentManagedPlace = (place, userId) => {
  const access = resolvePlaceAccess(place, userId);
  const { staffMemberships, ...safePlace } = place;
  const visibleStaff = access?.isOwner ? staffMemberships : [];
  return {
    ...safePlace,
    access,
    staff: visibleStaff?.map(({ user, ...membership }) => ({ ...membership, user })) || [],
    menuItems: canUsePlace(access, 'canManageMenu') ? safePlace.menuItems : [],
    campaigns: canUsePlace(access, 'canManageCampaigns') || canUsePlace(access, 'canViewMetrics') ? safePlace.campaigns : [],
    orders: canUsePlace(access, 'canManageOrders') || canUsePlace(access, 'canViewMetrics') ? safePlace.orders : [],
    reviews: canUsePlace(access, 'canViewMetrics') ? safePlace.reviews : [],
  };
};

const presentPublicPlace = (place) => {
  if (!place) return null;
  const { owner, ...publicPlace } = place;
  return {
    ...publicPlace,
    campaigns: owner?.role === 'BUSINESS' ? publicPlace.campaigns : [],
  };
};

const presentUser = (user) => {
  const { password, authUserId, preferences: preferencesText, ...safeUser } = user;
  let preferences = {};
  try {
    if (preferencesText) preferences = JSON.parse(preferencesText);
  } catch {
    preferences = {};
  }
  return { ...safeUser, preferences };
};

app.post('/api/auth/profile', authenticateSupabaseToken, async (req, res) => {
  try {
    const {
      name, role = 'CONSUMER', phoneNumber, adultConfirmed,
      businessName, category, lat, lng, businessPhone, photoUrl,
    } = req.body;
    const email = req.auth.email;

    if (!email || !name || !['CONSUMER', 'BUSINESS'].includes(role)) {
      return res.status(400).json({ error: 'Dados do perfil inválidos' });
    }
    if (adultConfirmed !== true) {
      return res.status(400).json({ error: 'É necessário confirmar que tens 18 anos ou mais' });
    }
    if (photoUrl && !isApprovedImageUrl(photoUrl)) {
      return res.status(400).json({ error: 'A imagem deve pertencer ao armazenamento oficial da SPOTS' });
    }

    const existingIdentity = await prisma.user.findUnique({
      where: { authUserId: req.auth.userId },
      include: { places: true },
    });
    if (existingIdentity) return res.json(presentUser(existingIdentity));

    const legacyEmail = await prisma.user.findUnique({ where: { email } });
    if (legacyEmail) {
      return res.status(409).json({
        error: 'Este email pertence a um perfil anterior que requer migração verificada',
      });
    }

    let user;
    if (role === 'BUSINESS') {
      const latitude = Number(lat);
      const longitude = Number(lng);
      if (!businessName || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !isValidSpotCategory(category)) {
        return res.status(400).json({ error: 'Nome do negócio, categoria aprovada e localização válida são obrigatórios' });
      }

      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            authUserId: req.auth.userId,
            email,
            name,
            phoneNumber,
            role: 'BUSINESS',
            adultConfirmedAt: new Date(),
          },
        });

        await tx.place.create({
          data: {
            name: businessName,
            category,
            lat: latitude,
            lng: longitude,
            phoneNumber: businessPhone,
            photoUrl,
            ownerId: newUser.id,
          },
        });
        return newUser;
      });
    } else {
      user = await prisma.user.create({
        data: {
          authUserId: req.auth.userId,
          email,
          name,
          phoneNumber,
          adultConfirmedAt: new Date(),
          role: 'CONSUMER',
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Bem-vindo à SPOTS!',
        message: 'A tua conta foi criada. Descobre locais em Luanda e planeia a visita.',
        type: 'SYSTEM',
      },
    });

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { places: true },
    });
    res.status(201).json(presentUser(fullUser));
  } catch (err) {
    console.error('Profile creation failed:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/auth/logout', authenticateSupabaseToken, async (req, res) => {
  try {
    if (req.auth.sessionId && req.auth.expiresAt) {
      await prisma.revokedSession.upsert({
        where: { id: req.auth.sessionId },
        update: { expiresAt: new Date(req.auth.expiresAt * 1000) },
        create: {
          id: req.auth.sessionId,
          expiresAt: new Date(req.auth.expiresAt * 1000),
        },
      });
    }
    await prisma.revokedSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ---------------------------------------------------------
// CONSUMER ROUTES (Map & Live Campaigns)
// ---------------------------------------------------------
app.get('/api/places', async (req, res) => {
  try {
    const places = await prisma.place.findMany({
      include: {
        owner: { select: { role: true } },
        campaigns: {
          where: { isActive: true }
        },
        reviews: {
          include: { user: { select: { name: true, initials: true, photoUrl: true } } },
          orderBy: { createdAt: 'desc' }
        },
        menuItems: { where: { available: true } }
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(places.map(presentPublicPlace));
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/places/:id', async (req, res) => {
  try {
    const place = await prisma.place.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        owner: { select: { role: true } },
        menuItems: { where: { available: true } },
        campaigns: { where: { isActive: true } },
        reviews: {
          include: { user: { select: { name: true, initials: true, photoUrl: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!place) return res.status(404).json({ error: 'Spot não encontrado' });
    res.json(presentPublicPlace(place));
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/orders/mine', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { place: { select: { id: true, name: true, photoUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders.map(({ itemsJson, ...order }) => ({ ...order, items: JSON.parse(itemsJson) })));
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível carregar os pedidos' });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  const parsed = parseOrderRequest(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { placeId, clientRequestId, items } = parsed.value;
  try {
    const existing = await prisma.order.findUnique({
      where: { userId_clientRequestId: { userId: req.user.id, clientRequestId } },
    });
    if (existing) return res.json(existing);

    const order = await prisma.$transaction(async (tx) => {
      const place = await tx.place.findUnique({
        where: { id: placeId },
        select: { id: true, takeAwayEnabled: true },
      });
      if (!place) throw Object.assign(new Error('Spot não encontrado'), { statusCode: 404 });
      if (!place.takeAwayEnabled) throw Object.assign(new Error('Este Spot não está a aceitar pedidos'), { statusCode: 409 });
      const menuItems = await tx.menuItem.findMany({
        where: { placeId, available: true, id: { in: items.map(({ menuItemId }) => menuItemId) } },
      });
      if (menuItems.length !== items.length) throw Object.assign(new Error('Um ou mais itens já não estão disponíveis'), { statusCode: 409 });
      const menuById = new Map(menuItems.map((item) => [item.id, item]));
      const snapshot = items.map(({ menuItemId, quantity }) => {
        const item = menuById.get(menuItemId);
        return { menuItemId, title: item.title, quantity, unitPrice: item.price };
      });
      const total = snapshot.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      return tx.order.create({
        data: { status: 'pending', total, userId: req.user.id, placeId, clientRequestId, itemsJson: JSON.stringify(snapshot) },
      });
    }, { isolationLevel: 'Serializable' });
    res.status(201).json(order);
  } catch (err) {
    if (err.code === 'P2002') {
      const existing = await prisma.order.findUnique({
        where: { userId_clientRequestId: { userId: req.user.id, clientRequestId } },
      });
      if (existing) return res.json(existing);
    }
    res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Não foi possível criar o pedido' });
  }
});

app.put('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) return res.status(400).json({ error: 'Pedido inválido' });
  try {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId: req.user.id } });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (order.status !== 'pending') return res.status(409).json({ error: 'Só pedidos pendentes podem ser cancelados' });
    const updated = await prisma.order.updateMany({
      where: { id: orderId, userId: req.user.id, status: 'pending' },
      data: { status: 'cancelled' },
    });
    if (updated.count !== 1) return res.status(409).json({ error: 'O estado do pedido foi entretanto alterado' });
    res.json(await prisma.order.findUnique({ where: { id: orderId } }));
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível cancelar o pedido' });
  }
});

// A posição precisa é usada apenas para esta decisão e nunca é persistida.
app.post('/api/campaigns/eligible', async (req, res) => {
  try {
    const parsed = parseLocationSample(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const campaigns = await prisma.campaign.findMany({
      where: { isActive: true, place: { owner: { role: 'BUSINESS' } } },
      include: { place: { select: { id: true, lat: true, lng: true } } },
      orderBy: { id: 'asc' },
    });
    const eligible = campaigns.flatMap((campaign) => {
      const decision = classifyCampaignPosition(parsed.value, campaign.place, campaign.radiusKm);
      return decision.eligible ? [{
        campaignId: campaign.id,
        placeId: campaign.place.id,
        status: decision.status,
        distanceMetres: decision.distanceMetres,
        radiusMetres: decision.radiusMetres,
      }] : [];
    });
    res.json({ eligible, observedAt: parsed.value.observedAt.toISOString(), expiresInSeconds: 180 });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create or update a review
app.post('/api/places/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const placeId = parseInt(req.params.id);
    const userId = req.user.id;
    if (!Number.isInteger(placeId) || placeId <= 0) return res.status(400).json({ error: 'Spot inválido' });

    const parsed = parseReviewInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const placeExists = await prisma.place.findUnique({ where: { id: placeId }, select: { id: true } });
    if (!placeExists) return res.status(404).json({ error: 'Spot não encontrado' });

    const reviewArgs = {
      where: { userId_placeId: { userId, placeId } },
      update: parsed.value,
      create: { ...parsed.value, userId, placeId },
      include: { user: { select: { name: true, initials: true, photoUrl: true } } },
    };
    let review;
    try {
      review = await prisma.review.upsert(reviewArgs);
    } catch (error) {
      if (error.code !== 'P2002') throw error;
      review = await prisma.review.update({
        where: reviewArgs.where,
        data: parsed.value,
        include: reviewArgs.include,
      });
    }
    res.json(review);
  } catch (err) {
    console.error('Failed to submit review', err);
    res.status(500).json({ error: 'Não foi possível guardar a avaliação' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        places: true,
        staffMemberships: { include: { place: { select: { id: true, name: true } } } },
      }
    });
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    
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
    res.status(500).json({ error: 'Erro interno do servidor' });
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
    res.status(500).json({ error: 'Erro interno do servidor' });
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
    res.status(500).json({ error: 'Erro interno do servidor' });
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
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update current user
app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { name, email, phoneNumber, photoUrl, initials, preferences } = req.body;

    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (email && email !== currentUser.email) {
      return res.status(409).json({ error: 'A alteração de email fica pendente nesta versão' });
    }

    const validatedPreferences = preferences === undefined ? null : parsePreferences(preferences);
    if (validatedPreferences?.error) return res.status(400).json({ error: validatedPreferences.error });
    if (photoUrl !== undefined && !isApprovedProfileImage(photoUrl)) {
      return res.status(400).json({
        error: 'A fotografia de perfil deve ser uma imagem local ou pertencer ao armazenamento oficial da SPOTS',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(initials !== undefined && { initials }),
        ...(validatedPreferences && { preferences: JSON.stringify(validatedPreferences.value) }),
      },
      include: {
        places: true,
        staffMemberships: { include: { place: { select: { id: true, name: true } } } },
      }
    });

    if (preferences !== undefined) {
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Preferências actualizadas',
          message: 'As tuas preferências e os Spots guardados foram actualizados.',
          type: 'ALERT'
        }
      });
    }
    
    const { password, preferences: prefsStr, ...userWithoutPassword } = updatedUser;
    let parsedPreferences = {};
    try { if (prefsStr) parsedPreferences = JSON.parse(prefsStr); } catch (e) {}
    
    res.json({ ...userWithoutPassword, preferences: parsedPreferences });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete current user
app.delete('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await deleteAccountAtomically({
      prisma,
      supabaseAdmin,
      userId: req.user.id,
      authUserId: req.auth.userId,
    });
    res.status(result.pending ? 202 : 200).json({
      success: true,
      pending: result.pending,
      message: result.pending
        ? 'A eliminação foi agendada e será concluída automaticamente.'
        : 'A conta foi eliminada.',
    });
  } catch (err) {
    if (err instanceof AccountDeletionError) {
      const status = err.code === 'AUTH_ADMIN_UNAVAILABLE' ? 503 : 502;
      return res.status(status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Não foi possível concluir a eliminação da conta' });
  }
});

// Update password
// ---------------------------------------------------------
// BUSINESS ROUTES (Menu & Orders)
// ---------------------------------------------------------

// Get my places (for a business owner)
app.get('/api/business/places', authenticateToken, async (req, res) => {
  try {
    const places = await prisma.place.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { staffMemberships: { some: { userId: req.user.id } } },
        ],
      },
      include: {
        menuItems: true,
        campaigns: true,
        orders: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        staffMemberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        reviews: {
          include: { user: { select: { name: true, initials: true, photoUrl: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    res.json(places.map((place) => presentManagedPlace(place, req.user.id)));
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/business/places/:id/staff', authenticateToken, async (req, res) => {
  try {
    const placeId = Number(req.params.id);
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { place, access } = await getPlaceAccess(placeId, req.user.id);
    if (!place || !access?.isOwner) return res.status(403).json({ error: 'Apenas o responsável pode adicionar funcionários' });
    if (!email) return res.status(400).json({ error: 'Email do funcionário obrigatório' });

    const target = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
    if (!target) return res.status(404).json({ error: 'A pessoa precisa de uma conta SPOTS existente' });
    if (target.id === req.user.id) return res.status(409).json({ error: 'O responsável já tem acesso total' });

    const permissions = normalisePermissions(req.body.permissions);
    const membership = await prisma.$transaction(async (tx) => {
      const ownerPlaces = await tx.place.findMany({ where: { ownerId: req.user.id }, select: { id: true } });
      const ownerPlaceIds = ownerPlaces.map(({ id }) => id);
      const existingStaff = await tx.placeMembership.findMany({
        where: { placeId: { in: ownerPlaceIds } },
        distinct: ['userId'],
        select: { userId: true },
      });
      const alreadyInTeam = existingStaff.some(({ userId }) => userId === target.id);
      if (!alreadyInTeam && existingStaff.length >= 4) {
        const error = new Error('Limite de quatro funcionários atingido');
        error.code = 'STAFF_LIMIT';
        throw error;
      }
      const created = await tx.placeMembership.create({
        data: { placeId, userId: target.id, ...permissions },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      await tx.businessAuditEvent.create({
        data: {
          actorUserId: req.user.id,
          placeId,
          targetUserId: target.id,
          action: 'STAFF_ADDED',
          detailsJson: JSON.stringify(permissions),
        },
      });
      return created;
    }, { isolationLevel: 'Serializable' });
    res.status(201).json(membership);
  } catch (err) {
    if (err.code === 'STAFF_LIMIT') return res.status(409).json({ error: err.message });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Este funcionário já pertence ao Spot' });
    if (err.code === 'P2034') return res.status(409).json({ error: 'A equipa foi alterada ao mesmo tempo. Tenta novamente.' });
    console.error('Failed to add staff member', err.message);
    res.status(500).json({ error: 'Não foi possível adicionar o funcionário' });
  }
});

app.put('/api/business/places/:placeId/staff/:membershipId', authenticateToken, async (req, res) => {
  try {
    const placeId = Number(req.params.placeId);
    const membershipId = Number(req.params.membershipId);
    const { place, access } = await getPlaceAccess(placeId, req.user.id);
    if (!place || !access?.isOwner) return res.status(403).json({ error: 'Apenas o responsável pode alterar permissões' });
    const permissions = normalisePermissions(req.body.permissions);
    const existing = await prisma.placeMembership.findFirst({ where: { id: membershipId, placeId } });
    if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado neste Spot' });
    const membership = await prisma.$transaction(async (tx) => {
      const updated = await tx.placeMembership.update({
        where: { id: membershipId },
        data: permissions,
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      await tx.businessAuditEvent.create({
        data: {
          actorUserId: req.user.id,
          placeId,
          targetUserId: existing.userId,
          action: 'STAFF_PERMISSIONS_UPDATED',
          detailsJson: JSON.stringify(permissions),
        },
      });
      return updated;
    });
    res.json(membership);
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível alterar as permissões' });
  }
});

app.delete('/api/business/places/:placeId/staff/:membershipId', authenticateToken, async (req, res) => {
  try {
    const placeId = Number(req.params.placeId);
    const membershipId = Number(req.params.membershipId);
    const { place, access } = await getPlaceAccess(placeId, req.user.id);
    if (!place || !access?.isOwner) return res.status(403).json({ error: 'Apenas o responsável pode remover funcionários' });
    const existing = await prisma.placeMembership.findFirst({ where: { id: membershipId, placeId } });
    if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado neste Spot' });
    await prisma.$transaction([
      prisma.placeMembership.delete({ where: { id: membershipId } }),
      prisma.businessAuditEvent.create({
        data: {
          actorUserId: req.user.id,
          placeId,
          targetUserId: existing.userId,
          action: 'STAFF_REMOVED',
        },
      }),
    ]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível remover o funcionário' });
  }
});

// Create a new place
app.post('/api/business/places', businessOnly, async (req, res) => {
  try {
    const { name, category, lat, lng } = req.body;
    if (typeof name !== 'string' || !name.trim() || !isValidSpotCategory(category)) {
      return res.status(400).json({ error: 'Nome e categoria aprovada são obrigatórios' });
    }
    const coordinates = parseCoordinates(lat, lng);
    if (coordinates.error) return res.status(400).json({ error: coordinates.error });
    const newPlace = await prisma.place.create({
      data: {
        name: name.trim().slice(0, 160),
        category,
        ...coordinates.value,
        ownerId: req.user.id
      }
    });
    res.json(newPlace);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update a place (Full Profile Edit)
app.put('/api/business/places/:id', businessOnly, async (req, res) => {
  try {
    const { name, category, photoUrl, phoneNumber, takeAwayEnabled } = req.body;
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'Nome do Spot inválido' });
    }
    if (takeAwayEnabled !== undefined && typeof takeAwayEnabled !== 'boolean') {
      return res.status(400).json({ error: 'Estado de take-away inválido' });
    }
    if (category !== undefined && !isValidSpotCategory(category)) {
      return res.status(400).json({ error: 'Categoria inválida' });
    }
    if (photoUrl && !isApprovedImageUrl(photoUrl)) {
      return res.status(400).json({ error: 'A imagem deve pertencer ao armazenamento oficial da SPOTS' });
    }
    
    // First find the place to ensure it exists and belongs to owner
    const placeId = parseInt(req.params.id);
    const place = await prisma.place.findUnique({ where: { id: placeId } });
    if (!place || place.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Sem autorização para este Spot' });
    }

    const updated = await prisma.place.update({
      where: { id: placeId },
      data: {
        ...(name && { name: name.trim().slice(0, 160) }),
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
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create a Campaign
app.post('/api/business/campaigns', authenticateToken, async (req, res) => {
  try {
    const parsed = parseCampaignInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const { placeId, ...campaignData } = parsed.value;
    
    // Verify owner
    const { place, access } = await getPlaceAccess(placeId, req.user.id);
    if (!place || !canUsePlace(access, 'canManageCampaigns')) return res.status(403).json({ error: 'Sem permissão para gerir campanhas' });

    const campaign = await prisma.campaign.create({
      data: {
        ...campaignData,
        placeId,
        isSynthetic: process.env.NODE_ENV !== 'production',
      }
    });

    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/business/campaigns/:id/status', authenticateToken, async (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0 || typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ error: 'Estado da campanha inválido' });
    }
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    const { access } = await getPlaceAccess(campaign.placeId, req.user.id);
    if (!canUsePlace(access, 'canManageCampaigns')) return res.status(403).json({ error: 'Sem permissão para gerir esta campanha' });

    const [updated] = await prisma.$transaction([
      prisma.campaign.update({ where: { id: campaignId }, data: { isActive: req.body.isActive } }),
      prisma.businessAuditEvent.create({
        data: {
          actorUserId: req.user.id,
          placeId: campaign.placeId,
          action: 'CAMPAIGN_STATUS_CHANGED',
          detailsJson: JSON.stringify({ campaignId, isActive: req.body.isActive }),
        },
      }),
    ]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível actualizar a campanha' });
  }
});

// Calculate Potential Reach for Broadcast
app.get('/api/business/reach', authenticateToken, async (req, res) => {
  const placeId = Number(req.query.placeId);
  const { place, access } = await getPlaceAccess(placeId, req.user.id);
  if (!place || !canUsePlace(access, 'canViewMetrics')) return res.status(403).json({ error: 'Sem permissão para consultar métricas' });
  res.json({ reach: null, methodology: 'unavailable' });
});

// Increment Campaign Clicks (Leads)
app.post('/api/campaigns/:id/click', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) return res.status(400).json({ error: 'Campanha inválida' });
    const result = await recordCampaignClick(prisma, { campaignId, userId: req.user.id });
    res.json({ success: true, counted: result.counted });
  } catch (err) {
    if (err.code === 'CAMPAIGN_NOT_FOUND') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Increment Campaign Conversions (Recovering Clients)
app.post('/api/campaigns/:id/convert', authenticateToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { place: true } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    const { access } = await getPlaceAccess(campaign.placeId, req.user.id);
    if (!canUsePlace(access, 'canManageCampaigns')) return res.status(403).json({ error: 'Sem acesso a esta campanha' });
    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { conversions: { increment: 1 } }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Add a menu item
app.post('/api/business/menu', authenticateToken, async (req, res) => {
  try {
    const parsed = parseMenuItem(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const { placeId, ...itemData } = parsed.value;
    const { place, access } = await getPlaceAccess(placeId, req.user.id);
    if (!place || !canUsePlace(access, 'canManageMenu')) return res.status(403).json({ error: 'Sem permissão para gerir o menu' });
    const item = await prisma.menuItem.create({
      data: { ...itemData, placeId }
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Toggle Menu Item availability
app.put('/api/business/menu/:id', authenticateToken, async (req, res) => {
  try {
    const availability = parseAvailability(req.body.available);
    if (availability.error) return res.status(400).json({ error: availability.error });
    const itemId = parseInt(req.params.id);
    const existingItem = await prisma.menuItem.findUnique({ where: { id: itemId }, include: { place: true } });
    if (!existingItem) return res.status(404).json({ error: 'Item não encontrado' });
    const { access } = await getPlaceAccess(existingItem.placeId, req.user.id);
    if (!canUsePlace(access, 'canManageMenu')) return res.status(403).json({ error: 'Sem acesso a este item' });
    const item = await prisma.menuItem.update({
      where: { id: itemId },
      data: { available: availability.value }
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Setup Business Profile
app.post('/api/business/setup', authenticateToken, async (req, res) => {
  try {
    const { name, category, lat, lng, phoneNumber } = req.body;
    if (typeof name !== 'string' || !name.trim() || !isValidSpotCategory(category)) {
      return res.status(400).json({ error: 'Nome e categoria aprovada são obrigatórios' });
    }
    const coordinates = parseCoordinates(lat, lng);
    if (coordinates.error) return res.status(400).json({ error: coordinates.error });
    
    // Create the business place
    const place = await prisma.place.create({
      data: {
        name: name.trim().slice(0, 160),
        category,
        ...coordinates.value,
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
    res.status(500).json({ error: 'Não foi possível configurar o negócio' });
  }
});

// Update Order Status
app.put('/api/business/orders/:id', authenticateToken, async (req, res) => {
  try {
    const parsedStatus = parseOrderStatus(req.body.status);
    if (parsedStatus.error) return res.status(400).json({ error: parsedStatus.error });
    
    // Verify owner
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { place: true } });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
    const { access } = await getPlaceAccess(order.placeId, req.user.id);
    if (!canUsePlace(access, 'canManageOrders')) return res.status(403).json({ error: 'Sem permissão para gerir pedidos' });

    if (!canBusinessTransition(order.status, parsedStatus.value)) {
      return res.status(409).json({ error: `O pedido só pode avançar para ${BUSINESS_TRANSITIONS[order.status] || 'nenhum estado adicional'}` });
    }
    const [updated] = await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { status: parsedStatus.value },
      });
      if (changed.count !== 1) throw Object.assign(new Error('O pedido foi entretanto actualizado'), { code: 'ORDER_CONFLICT' });
      const current = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      await tx.notification.create({
        data: {
          userId: order.userId,
          type: 'ORDER',
          title: `Pedido #${order.id} actualizado`,
          message: `Novo estado: ${{ preparing: 'Em preparação', ready: 'Pronto', completed: 'Concluído' }[parsedStatus.value]}.`,
        },
      });
      await tx.businessAuditEvent.create({
        data: {
          actorUserId: req.user.id,
          placeId: order.placeId,
          action: 'ORDER_STATUS_CHANGED',
          detailsJson: JSON.stringify({ orderId, from: order.status, to: parsedStatus.value }),
        },
      });
      return [current];
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'ORDER_CONFLICT') return res.status(409).json({ error: err.message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

const PORT = Number(process.env.PORT || 3001);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
  });
  const reconcile = () => reconcilePendingAccountDeletions({ prisma, supabaseAdmin })
    .catch(() => console.error('Não foi possível reconciliar eliminações pendentes.'));
  reconcile();
  const deletionReconciler = setInterval(reconcile, 5 * 60 * 1000);
  deletionReconciler.unref();
}

module.exports = { app };
