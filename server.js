require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const methodOverride = require('method-override');

const { connectDB } = require('./data/db');
const store = require('./data/store');
const styles = require('./utils/styles');
const { validateRestaurant, validateUser, validateLogin, validateOrder } = require('./utils/validate');
const { signToken, attachUser, requireAuth, requireOwner } = require('./middleware/auth');
const { enqueue } = require('./jobs/queue');

const app = express();

// ---------- MIDDLEWARE ----------
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/order', limiter);
app.use('/login', limiter);

app.use(attachUser);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use((req, res, next) => { res.locals.s = styles; next(); });

// ---------- HOME ----------
app.get('/', async (req, res, next) => {
  try {
    const restaurants = await store.listRestaurants();
    res.render('index', { restaurants });
  } catch (err) { next(err); }
});

// ---------- AUTH ----------
app.get('/register', (req, res) => {
  res.render('register-user', { values: {}, errors: {} });
});

app.post('/register', async (req, res, next) => {
  try {
    const { values, errors } = await validateUser(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).render('register-user', { values, errors });
    }
    const hashed = await bcrypt.hash(values.password, 10);
    const user = await store.createUser({
      name: values.name,
      email: values.email,
      password: hashed,
      role: values.role
    });
    req.session.userId = user._id.toString();
    res.redirect('/');
  } catch (err) { next(err); }
});

app.get('/login', (req, res) => {
  res.render('login', { values: {}, errors: {}, next: req.query.next || '/' });
});

app.post('/login', async (req, res, next) => {
  try {
    const { values, errors } = validateLogin(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).render('login', { values, errors, next: req.body.next || '/' });
    }
    const user = await store.findUser(values.email);
    if (!user || !(await bcrypt.compare(values.password, user.password))) {
      errors.email = 'Invalid email or password.';
      return res.status(400).render('login', { values, errors, next: req.body.next || '/' });
    }
    req.session.userId = user._id.toString();
    res.redirect(req.body.next || '/');
  } catch (err) { next(err); }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ---------- RESTAURANTS ----------
app.get('/restaurants/register', requireAuth, requireOwner, (req, res) => {
  res.render('register-restaurant', { values: {}, errors: {} });
});

app.post('/restaurants/register', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const { values, errors, id } = await validateRestaurant(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).render('register-restaurant', { values, errors });
    }
    await store.createRestaurant({
      id,
      ...values,
      ownerId: req.user._id,
      menu: []
    });
    res.redirect('/dashboard?restaurant=' + id + '&registered=1');
  } catch (err) { next(err); }
});

// ---------- ORDERS ----------
app.get('/order', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurant || '';
    const restaurants = await store.listRestaurants();
    const selected = restaurantId ? await store.findRestaurant(restaurantId) : null;
    res.render('order', {
      restaurants,
      selectedRestaurant: selected,
      menu: selected ? selected.menu : [],
      errors: {},
      values: {
        restaurantId,
        customerName: req.user ? req.user.name : '',
        phone: '', address: '', payment: 'COD', notes: '', qty: {}
      }
    });
  } catch (err) { next(err); }
});

app.post('/order', async (req, res, next) => {
  try {
    const { values, errors, items, total } = await validateOrder(req.body);
    const selectedRestaurant = await store.findRestaurant(values.restaurantId);

    if (Object.keys(errors).length) {
      const restaurants = await store.listRestaurants();
      return res.status(400).render('order', {
        restaurants,
        selectedRestaurant,
        menu: selectedRestaurant ? selectedRestaurant.menu : [],
        values, errors
      });
    }

    const order = await store.createOrder({
      id: await store.nextOrderId(),
      restaurantId: values.restaurantId,
      userId: req.user ? req.user._id : null,
      customerName: values.customerName,
      phone: values.phone,
      address: values.address,
      payment: values.payment,
      notes: values.notes,
      items,
      total,
      status: 'Received'
    });

    enqueue('send-confirmation', order, async (o) => {
      console.log(`[NOTIFY] Order ${o.id} confirmed for ${o.customerName}`);
    });

    res.render('success', { order, restaurant: selectedRestaurant });
  } catch (err) { next(err); }
});

// ---------- MY ORDERS ----------
app.get('/my-orders', requireAuth, async (req, res, next) => {
  try {
    const orders = await store.listOrdersByUser(req.user._id);
    res.render('my-orders', { orders });
  } catch (err) { next(err); }
});

// ---------- DASHBOARD ----------
app.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'owner') {
      const owned = await store.listRestaurantsByOwner(req.user._id);
      const selected = owned.find((r) => r.id === req.query.restaurant) || owned[0] || null;
      const orders = selected
        ? await store.listOrdersByRestaurant(selected.id)
        : await store.listOrders();
      return res.render('dashboard', {
        restaurants: owned,
        selected,
        orders,
        registered: req.query.registered === '1'
      });
    }
    const orders = await store.listOrdersByUser(req.user._id);
    res.render('dashboard', { restaurants: [], selected: null, orders, registered: false });
  } catch (err) { next(err); }
});

// ---------- ADMIN MENU ----------
app.get('/admin/menu', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const owned = await store.listRestaurantsByOwner(req.user._id);
    const selected = owned.find((r) => r.id === req.query.restaurant) || owned[0] || null;
    res.render('admin-menu', { restaurants: owned, selected, errors: {}, values: {} });
  } catch (err) { next(err); }
});

app.post('/admin/menu', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const restaurant = await store.findRestaurant(req.body.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).render('404', { message: 'Not allowed.' });
    }
    const name = (req.body.name || '').trim();
    const price = parseInt(req.body.price, 10) || 0;
    if (name.length < 2 || price <= 0) {
      const owned = await store.listRestaurantsByOwner(req.user._id);
      return res.status(400).render('admin-menu', {
        restaurants: owned,
        selected: restaurant,
        errors: { name: 'Enter a valid item name.', price: 'Enter a valid price.' },
        values: req.body
      });
    }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    restaurant.menu.push({ id, name, price, available: true });
    await store.saveRestaurant(restaurant);
    res.redirect('/admin/menu?restaurant=' + restaurant.id);
  } catch (err) { next(err); }
});

app.post('/admin/menu/:itemId/toggle', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const restaurant = await store.findRestaurant(req.body.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).send('Forbidden');
    }
    const item = restaurant.menu.find((m) => m.id === req.params.itemId);
    if (item) item.available = !item.available;
    await store.saveRestaurant(restaurant);
    res.redirect('/admin/menu?restaurant=' + restaurant.id);
  } catch (err) { next(err); }
});

app.post('/admin/menu/:itemId/delete', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const restaurant = await store.findRestaurant(req.body.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).send('Forbidden');
    }
    restaurant.menu = restaurant.menu.filter((m) => m.id !== req.params.itemId);
    await store.saveRestaurant(restaurant);
    res.redirect('/admin/menu?restaurant=' + restaurant.id);
  } catch (err) { next(err); }
});

// ---------- ORDER STATUS ----------
app.post('/orders/:id/status', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const order = await store.findOrderById(req.params.id);
    if (!order) return res.status(404).send('Not found');
    const restaurant = await store.findRestaurant(order.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).send('Forbidden');
    }
    const status = req.body.status;
    if (['Received', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(status)) {
      order.status = status;
      await store.saveOrder(order);
      enqueue('status-update', order, async (o) => {
        console.log(`[NOTIFY] Order ${o.id} status → ${o.status}`);
      });
    }
    res.redirect('/dashboard?restaurant=' + restaurant.id);
  } catch (err) { next(err); }
});

// ---------- API ----------
app.get('/api/restaurants', async (req, res, next) => {
  try {
    const restaurants = await store.listRestaurants();
    res.json(restaurants.map((r) => ({ id: r.id, name: r.name, cuisine: r.cuisine })));
  } catch (err) { next(err); }
});

app.get('/api/restaurants/:id/menu', async (req, res, next) => {
  try {
    const r = await store.findRestaurant(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r.menu);
  } catch (err) { next(err); }
});

app.get('/api/orders', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'owner') {
      const owned = await store.listRestaurantsByOwner(req.user._id);
      const ownedIds = owned.map((r) => r.id);
      const all = await store.listOrders();
      return res.json(all.filter((o) => ownedIds.includes(o.restaurantId)));
    }
    res.json(await store.listOrdersByUser(req.user._id));
  } catch (err) { next(err); }
});

// ---------- 404 + ERROR HANDLER ----------
app.use((req, res) => res.status(404).render('404', { message: 'Page not found.' }));

app.use((err, req, res, next) => {
  console.error('🚨 ERROR on', req.originalUrl);
  console.error(err.message);
  console.error(err.stack);
  res.status(500).send('<pre>' + err.message + '\n\n' + err.stack + '</pre>');
});

// ---------- START ----------
const PORT = process.env.PORT || 3000;

(async () => {
  await connectDB();
  await store.seedIfEmpty();
  app.listen(PORT, () => {
    console.log('=================================================');
    console.log('  QuickBite – Full Stack Platform (MongoDB)');
    console.log('  Running:  http://localhost:' + PORT);
    console.log('  Tasks:    1–8 (with real DB)');
    console.log('=================================================');
  });
})();