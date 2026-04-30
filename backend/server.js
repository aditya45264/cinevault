require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const watchlistRoutes = require('./routes/watchlist');
const reviewRoutes = require('./routes/reviews');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 5000;

//
// ================= MIDDLEWARE =================
//

app.use(cors({
  origin: '*'
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});

app.use(limiter);

//
// ================= TEST ROUTE =================
//

app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend is working 🚀"
  });
});

//
// ================= HEALTH CHECK =================
//

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

//
// ================= API ROUTES =================
//

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/history', historyRoutes);
//
// ================= FRONTEND (PRODUCTION) =================
//
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});





//
// ================= ERROR HANDLER =================
//

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

//
// ================= DATABASE + SERVER START =================
//
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing in .env file");
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });