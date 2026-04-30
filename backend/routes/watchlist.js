const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// GET /watchlist
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ watchlist: user.watchlist });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch watchlist.' });
  }
});

// POST /watchlist
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { movieId, title, poster, mediaType, rating } = req.body;
    if (!movieId || !title) {
      return res.status(400).json({ error: 'movieId and title are required.' });
    }

    const user = await User.findById(req.user._id);
    const exists = user.watchlist.some(item => item.movieId === String(movieId));
    if (exists) {
      return res.status(409).json({ error: 'Already in watchlist.' });
    }

    user.watchlist.push({ movieId: String(movieId), title, poster, mediaType, rating });
    await user.save();

    res.status(201).json({ message: 'Added to watchlist!', watchlist: user.watchlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add to watchlist.' });
  }
});

// DELETE /watchlist/:movieId
router.delete('/:movieId', authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.params;
    const user = await User.findById(req.user._id);
    user.watchlist = user.watchlist.filter(item => item.movieId !== movieId);
    await user.save();
    res.json({ message: 'Removed from watchlist.', watchlist: user.watchlist });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from watchlist.' });
  }
});

module.exports = router;
