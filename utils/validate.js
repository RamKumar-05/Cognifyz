const store = require('../data/store');
const clean = (v) => (typeof v === 'string' ? v.trim() : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[6-9]\d{9}$/;
const STRONG_PASS = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

async function validateRestaurant(body) {
  const v = {
    name: clean(body.name),
    email: clean(body.email).toLowerCase(),
    phone: clean(body.phone),
    cuisine: clean(body.cuisine),
    address: clean(body.address)
  };
  const errors = {};
  if (v.name.length < 3 || v.name.length > 60) errors.name = 'Enter a restaurant name of 3 to 60 characters.';
  if (!EMAIL.test(v.email)) errors.email = 'Enter a valid email address.';
  if (!PHONE.test(v.phone)) errors.phone = 'Enter a 10-digit mobile number starting with 6-9.';
  if (!['North Indian', 'South Indian', 'Chinese', 'Fast Food', 'Desserts'].includes(v.cuisine)) errors.cuisine = 'Choose a cuisine from the list.';
  if (v.address.length < 8) errors.address = 'Enter the full street address (at least 8 characters).';
  const id = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!errors.name) {
    const existing = await store.findRestaurant(id);
    if (existing) errors.name = 'A restaurant with this name is already registered.';
  }
  return { values: v, errors, id };
}

async function validateUser(body) {
  const v = {
    name: clean(body.name),
    email: clean(body.email).toLowerCase(),
    password: clean(body.password),
    role: clean(body.role) || 'customer'
  };
  const errors = {};
  if (v.name.length < 2) errors.name = 'Enter your name.';
  if (!EMAIL.test(v.email)) errors.email = 'Enter a valid email.';
  if (!STRONG_PASS.test(v.password)) errors.password = 'Password must be 8+ chars with upper, lower, number, and symbol.';
  if (!['customer', 'owner'].includes(v.role)) errors.role = 'Choose a valid role.';
  const existing = await store.findUser(v.email);
  if (existing) errors.email = 'Email already registered.';
  return { values: v, errors };
}

function validateLogin(body) {
  const v = { email: clean(body.email).toLowerCase(), password: clean(body.password) };
  const errors = {};
  if (!v.email) errors.email = 'Enter your email.';
  if (!v.password) errors.password = 'Enter your password.';
  return { values: v, errors };
}

async function validateOrder(body) {
  const v = {
    restaurantId: clean(body.restaurantId),
    customerName: clean(body.customerName),
    phone: clean(body.phone),
    address: clean(body.address),
    payment: clean(body.payment),
    notes: clean(body.notes),
    qty: {}
  };
  const errors = {};

  const restaurant = await store.findRestaurant(v.restaurantId);
  if (!restaurant) errors.restaurantId = 'Choose a restaurant.';
  if (v.customerName.length < 2) errors.customerName = 'Enter your name.';
  if (!PHONE.test(v.phone)) errors.phone = 'Enter a 10-digit mobile number starting with 6-9.';
  if (v.address.length < 8) errors.address = 'Enter a delivery address (at least 8 characters).';
  if (!['COD', 'UPI', 'CARD'].includes(v.payment)) errors.payment = 'Choose a payment method.';
  if (v.notes.length > 200) errors.notes = 'Notes can be at most 200 characters.';

  const items = [];
  let total = 0;
  if (restaurant) {
    for (const m of restaurant.menu) {
      const q = parseInt(body['qty_' + m.id], 10) || 0;
      if (q < 0 || q > 10) { errors.items = 'Quantity per item must be between 0 and 10.'; break; }
      v.qty[m.id] = q;
      if (q > 0) {
        if (!m.available) { errors.items = `"${m.name}" is currently out of stock.`; break; }
        items.push({ name: m.name, price: m.price, qty: q });
        total += q * m.price;
      }
    }
  }
  if (!errors.items && items.length === 0) errors.items = 'Add at least one item to your order.';
  return { values: v, errors, items, total };
}

module.exports = { validateRestaurant, validateUser, validateLogin, validateOrder };