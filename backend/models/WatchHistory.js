const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movieId: { type: String, required: true },
  title: { type: String, required: true },
  poster: { type: String },
  mediaType: { type: String, enum: ['movie', 'tv'], default: 'movie' },
  rating: { type: Number },
  watchedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('WatchHistory', watchHistorySchema);