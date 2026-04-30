const express = require('express');
const router = express.Router();
const WatchHistory = require('../models/WatchHistory');
const Review = require('../models/Review');
const authMiddleware = require('../middleware/auth');

// GET /history - get user's watch history + reviews as timeline
router.get('/', authMiddleware, async (req, res) => {
  try {
    const history = await WatchHistory.find({ userId: req.user._id })
      .sort({ watchedAt: -1 })
      .limit(50);

    const reviews = await Review.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const timeline = [
      ...history.map(h => ({ ...h.toObject(), type: 'watched', date: h.watchedAt })),
      ...reviews.map(r => ({ ...r.toObject(), type: 'reviewed', date: r.createdAt }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ timeline });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timeline.' });
  }
});

// POST /history - add to watch history
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { movieId, title, poster, mediaType, rating, watchedAt } = req.body;

    const existing = await WatchHistory.findOneAndUpdate(
      { userId: req.user._id, movieId },
      { watchedAt: watchedAt ? new Date(watchedAt) : new Date(), title, poster, mediaType, rating },
      { new: true, upsert: true }
    );

    res.json({ message: 'Added to watch history', history: existing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to history.' });
  }
});

// DELETE /history/:movieId - remove from history
router.delete('/:movieId', authMiddleware, async (req, res) => {
  try {
    await WatchHistory.findOneAndDelete({ userId: req.user._id, movieId: req.params.movieId });
    res.json({ message: 'Removed from history' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from history.' });
  }
});

module.exports = router;