# 🎬 BingeBrowse — OTT Content Discovery App

A full-stack Netflix-inspired content discovery web application built with Node.js, Express, MongoDB Atlas, and TMDB API.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ installed
- MongoDB Atlas account (free tier works)
- TMDB API key (free from themoviedb.org)

---

## 📁 Project Structure

```
ott-app/
├── backend/
│   ├── models/
│   │   ├── User.js          # User schema (name, email, password, watchlist)
│   │   └── Review.js        # Review schema (userId, movieId, rating, comment)
│   ├── routes/
│   │   ├── auth.js          # /register, /login, /profile
│   │   ├── movies.js        # TMDB proxy routes
│   │   ├── watchlist.js     # Watchlist CRUD
│   │   └── reviews.js       # Review CRUD
│   ├── middleware/
│   │   └── auth.js          # JWT auth middleware
│   ├── server.js            # Express app + MongoDB connection
│   ├── package.json
│   └── .env.example         # → Copy to .env and fill in values
├── frontend/
│   ├── index.html           # Single-page application
│   ├── css/
│   │   └── styles.css       # Full dark/light theme styles
│   └── js/
│       └── app.js           # All frontend logic
└── README.md
```

---

## ⚙️ Setup Steps

### 1. Clone / extract the project

```bash
cd ott-app
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ottapp
JWT_SECRET=your_very_long_random_secret_key_here
TMDB_API_KEY=your_tmdb_api_key_here
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 3. Get your TMDB API Key

1. Go to [https://www.themoviedb.org/](https://www.themoviedb.org/)
2. Create a free account
3. Go to Settings → API → Request an API key
4. Copy the **API Key (v3 auth)** into your `.env`

### 4. Set up MongoDB Atlas

1. Go to [https://cloud.mongodb.com/](https://cloud.mongodb.com/)
2. Create a free cluster (M0)
3. Create a database user (username + password)
4. Allow all IPs in Network Access (0.0.0.0/0) for development
5. Click "Connect" → "Connect your application"
6. Copy the connection string and paste into `MONGODB_URI` in `.env`
   - Replace `<password>` with your database user password
   - Replace `myFirstDatabase` with `ottapp`

### 5. Start the backend

```bash
# From the backend directory
npm start

# Or for development with auto-reload:
npm run dev
```

You should see:
```
✅ MongoDB connected
🚀 Server running on http://localhost:5000
```

### 6. Serve the frontend

Open the frontend in a browser. The easiest ways:

**Option A: VS Code Live Server**
- Install the "Live Server" extension
- Right-click `frontend/index.html` → "Open with Live Server"

**Option B: Python HTTP server**
```bash
cd frontend
python3 -m http.server 3000
# Open http://localhost:3000
```

**Option C: Node serve**
```bash
npm install -g serve
serve frontend -p 3000
```

**Option D: Open directly** (some features may not work due to CORS)
- Just open `frontend/index.html` in Chrome

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/profile` | Yes | Get current user |
| PUT | `/api/auth/profile` | Yes | Update profile |

### Movies (TMDB Proxy)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/movies/trending` | No | Trending content |
| GET | `/api/movies/popular` | No | Popular movies/TV |
| GET | `/api/movies/top-rated` | No | Top rated content |
| GET | `/api/movies/search?query=...` | No | Search |
| GET | `/api/movies/genres?type=movie` | No | Genre list |
| GET | `/api/movies/by-genre?genre_id=...` | No | Filter by genre |
| GET | `/api/movies/details/:id?type=...` | No | Movie/show details |
| GET | `/api/movies/recommend?genres=...` | No | Quiz recommendations |

### Watchlist
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/watchlist` | Yes | Get user's watchlist |
| POST | `/api/watchlist` | Yes | Add to watchlist |
| DELETE | `/api/watchlist/:movieId` | Yes | Remove from watchlist |

### Reviews
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reviews?movieId=...` | No | Get reviews for movie |
| POST | `/api/reviews` | Yes | Submit review |
| DELETE | `/api/reviews/:id` | Yes | Delete review |

---

## ✨ Features

- 🏠 **Home** — Hero banner with trending content + horizontal scrollable rows
- 🔍 **Explore** — Browse with search, type filter (movies/TV), genre filter, and pagination
- 🎯 **Quiz** — 3-step mood quiz that recommends personalized content via TMDB
- 🔖 **Watchlist** — Save, view, and remove content (stored in MongoDB)
- 💬 **Reviews** — Rate (1-5 stars) and review any movie/show (stored in MongoDB)
- 👤 **Profile** — User info and settings
- 🌓 **Dark/Light Mode** — Toggle with persistence
- 📱 **Responsive** — Works on mobile and desktop
- 🔐 **JWT Auth** — Secure authentication with 7-day tokens

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Data Source | TMDB API v3 |
| Security | express-rate-limit, CORS |

---

## 🔧 Troubleshooting

**"Failed to load content. Check your API key."**
→ Your TMDB API key in `.env` is missing or incorrect.

**"MongoDB connection failed"**
→ Check your `MONGODB_URI`. Make sure your IP is whitelisted in Atlas Network Access.

**CORS errors in browser**
→ Make sure your frontend URL matches the `FRONTEND_URL` in `.env`. The backend allows localhost:3000, localhost:5500, and 127.0.0.1 variants.

**"Please log in first" when accessing watchlist**
→ JWT session may have expired. Log out and log in again.
