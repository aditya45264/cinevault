const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  movieId: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['movie', 'tv'],
    default: 'movie'
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate reviews
reviewSchema.index({ userId: 1, movieId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
