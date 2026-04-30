const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  title: String,
  description: String,
  poster: String,
  rating: Number,
  year: Number,
  type: String // movie / series
});

module.exports = mongoose.model("Movie", movieSchema);