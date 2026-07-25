const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}

// Admin-only: create additional team members (no open self-registration, by design)
async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (role && !['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'role must be admin or member' });
    }
    const user = await User.create({ name, email, password, role: role || 'member' });
    res.status(201).json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

// Admin-only: list users, used to populate the "assign to" dropdown
async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ name: 1 });
    res.json({ users: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, createUser, listUsers };
