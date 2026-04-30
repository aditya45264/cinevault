const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const authMiddleware = require('../middleware/auth');

// GET /reviews?movieId=xxx
router.get('/', async (req, res) => {
  try {
    const { movieId } = req.query;
    if (!movieId) return res.status(400).json({ error: 'movieId is required.' });

    const reviews = await Review.find({ movieId }).sort({ createdAt: -1 });
    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({ reviews, avgRating: Math.round(avgRating * 10) / 10, total: reviews.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

// POST /reviews
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { movieId, mediaType, rating, comment } = req.body;
    if (!movieId || !rating) {
      return res.status(400).json({ error: 'movieId and rating are required.' });
    }

    const existing = await Review.findOne({ userId: req.user._id, movieId });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
      await existing.save();
      return res.json({ message: 'Review updated!', review: existing });
    }

    const review = await Review.create({
      userId: req.user._id,
      userName: req.user.name,
      movieId,
      mediaType,
      rating,
      comment
    });

    res.status(201).json({ message: 'Review submitted!', review });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

// DELETE /reviews/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    await review.deleteOne();
    res.json({ message: 'Review deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review.' });
  }
});

module.exports = router;
