// data/store.js — now backed by MongoDB via Mongoose
const { v4: uuid } = require('uuid');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

// ---------- USER HELPERS ----------
async function findUser(email) {
  return await User.findOne({ email });
}

async function findUserById(id) {
  try { return await User.findById(id); } catch { return null; }
}

async function createUser(data) {
  const user = new User(data);
  return await user.save();
}

// ---------- RESTAURANT HELPERS ----------
async function findRestaurant(id) {
  return await Restaurant.findOne({ id });
}

async function listRestaurants() {
  return await Restaurant.find({});
}

async function listRestaurantsByOwner(ownerId) {
  return await Restaurant.find({ ownerId });
}

async function createRestaurant(data) {
  const restaurant = new Restaurant(data);
  return await restaurant.save();
}

async function saveRestaurant(restaurant) {
  return await restaurant.save();
}

// ---------- ORDER HELPERS ----------
async function createOrder(data) {
  const order = new Order(data);
  return await order.save();
}

async function listOrders() {
  return await Order.find({});
}

async function listOrdersByRestaurant(restaurantId) {
  return await Order.find({ restaurantId });
}

async function listOrdersByUser(userId) {
  return await Order.find({ userId });
}

async function findOrderById(id) {
  return await Order.findOne({ id });
}

async function saveOrder(order) {
  return await order.save();
}

// ---------- ID GENERATORS ----------
async function nextOrderId() {
  const count = await Order.countDocuments();
  return 'QB-' + (1001 + count);
}

function newUserId() {
  return uuid();
}

// ---------- SEED DEFAULT RESTAURANTS (only if DB is empty) ----------
async function seedIfEmpty() {
  const count = await Restaurant.countDocuments();
  if (count > 0) return;

  await Restaurant.insertMany([
    {
      id: 'spice-route',
      name: 'Spice Route Kitchen',
      email: 'hello@spiceroute.test',
      phone: '9876543210',
      cuisine: 'North Indian',
      address: 'MG Road, Pune',
      menu: [
        { id: 'paneer-wrap', name: 'Paneer Tikka Wrap', price: 140, available: true },
        { id: 'veg-biryani', name: 'Veg Biryani', price: 180, available: true },
        { id: 'butter-naan', name: 'Butter Naan', price: 40, available: true }
      ]
    },
    {
      id: 'dosa-district',
      name: 'Dosa District',
      email: 'team@dosadistrict.test',
      phone: '9123456780',
      cuisine: 'South Indian',
      address: 'FC Road, Pune',
      menu: [
        { id: 'masala-dosa', name: 'Masala Dosa', price: 120, available: true },
        { id: 'idli-vada', name: 'Idli Vada Combo', price: 90, available: true },
        { id: 'filter-coffee', name: 'Filter Coffee', price: 50, available: true }
      ]
    }
  ]);
  console.log('🌱 Seeded default restaurants');
}

module.exports = {
  // users
  findUser,
  findUserById,
  createUser,
  // restaurants
  findRestaurant,
  listRestaurants,
  listRestaurantsByOwner,
  createRestaurant,
  saveRestaurant,
  // orders
  createOrder,
  listOrders,
  listOrdersByRestaurant,
  listOrdersByUser,
  findOrderById,
  saveOrder,
  // misc
  nextOrderId,
  newUserId,
  seedIfEmpty
};