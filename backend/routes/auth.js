const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered. Please log in.' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: user.toJSON()
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages[0] });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful!',
      token,
      user: user.toJSON()
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// GET /profile
router.get('/profile', authMiddleware, async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

// PUT /profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword, avatar } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (email) updates.email = email;
    if (avatar) updates.avatar = avatar;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required.' });
      }
      const isMatch = await req.user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      updates.password = newPassword;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ message: 'Profile updated!', user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

module.exports = router;
