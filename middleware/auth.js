const jwt = require('jsonwebtoken');
const store = require('../data/store');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

async function attachUser(req, res, next) {
  try {
    if (req.session && req.session.userId) {
      req.user = await store.findUserById(req.session.userId);
    }
    res.locals.currentUser = req.user || null;
    next();
  } catch (err) {
    console.error('attachUser error:', err.message);
    res.locals.currentUser = null;
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  next();
}

function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).render('404', { message: 'Owner access required.' });
  }
  next();
}

module.exports = { signToken, verifyToken, attachUser, requireAuth, requireOwner };