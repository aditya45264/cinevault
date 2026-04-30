const express = require('express');
const router = express.Router();  

const TMDB_BASE = 'https://api.themoviedb.org/3';
const getApiKey = () => process.env.TMDB_API_KEY;

const tmdbFetch = async (endpoint, params = {}) => {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.append('api_key', getApiKey());
  url.searchParams.append('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') {
      url.searchParams.append(k, v);
    }
  });

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
};
// GET /movies/trending
router.get('/trending', async (req, res) => {
  try {
    const { media_type = 'all', time_window = 'week' } = req.query;

    const data = await tmdbFetch(`/trending/${media_type}/${time_window}`);

    // safety check
    if (!data || !data.results) {
      return res.json({ results: [] });
    }

    res.json(data);
  } catch (err) {
    console.error("Trending error:", err.message);

    // IMPORTANT fallback (so UI never breaks)
    res.json({ results: [] });
  }
});
// GET /movies/popular
router.get('/popular', async (req, res) => {
  try {
    const { type = 'movie', page = 1 } = req.query;
    const endpoint = type === 'tv' ? '/tv/popular' : '/movie/popular';
    const data = await tmdbFetch(endpoint, { page });
    res.json(data);
  } catch (err) {
  console.error(err.message);
  res.json({ results: [] }); // NEVER crash frontend
}
});

// GET /movies/top-rated
router.get('/top-rated', async (req, res) => {
  try {
    const { type = 'movie', page = 1 } = req.query;
    const endpoint = type === 'tv' ? '/tv/top_rated' : '/movie/top_rated';
    const data = await tmdbFetch(endpoint, { page });
    res.json(data);
  } catch (err) {
  console.error(err.message);
  res.json({ results: [] }); // NEVER crash frontend
}
});

// GET /movies/search
router.get('/search', async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    if (!query) return res.status(400).json({ error: 'Search query is required.' });
    const data = await tmdbFetch('/search/multi', { query, page, include_adult: false });
    res.json(data);
  } catch (err) {
  console.error(err.message);
  res.json({ results: [] }); // NEVER crash frontend
}
});

// GET /movies/genres
router.get('/genres', async (req, res) => {
  try {
    const { type = 'movie' } = req.query;
    const data = await tmdbFetch(`/genre/${type}/list`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch genres.' });
  }
});

// GET /movies/by-genre
router.get('/by-genre', async (req, res) => {
  try {
    const { genre_id, type = 'movie', page = 1 } = req.query;
    if (!genre_id) return res.status(400).json({ error: 'genre_id is required.' });
    const data = await tmdbFetch(`/discover/${type}`, {
      with_genres: genre_id,
      sort_by: 'popularity.desc',
      page
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content by genre.' });
  }
});

// GET /movies/details/:id
router.get('/details/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'movie' } = req.query;
    const data = await tmdbFetch(`/${type}/${id}`, { append_to_response: 'credits,videos,similar' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content details.' });
  }
});

// GET /movies/recommend (for quiz)
router.get('/recommend', async (req, res) => {
  try {
    const { genres, type = 'movie', page = 1, language, year_from, year_to } = req.query;
    
  const params = {
  with_genres: genres ? genres.split(',').join('|') : '',
  sort_by: 'vote_average.desc',
  'vote_count.gte': 100,
  page
};

    if (language) {
      params['with_original_language'] = language;
    }

    if (year_from && year_to) {
      if (type === 'movie') {
        params['primary_release_date.gte'] = `${year_from}-01-01`;
        params['primary_release_date.lte'] = `${year_to}-12-31`;
      } else {
        params['first_air_date.gte'] = `${year_from}-01-01`;
        params['first_air_date.lte'] = `${year_to}-12-31`;
      }
    }

    const data = await tmdbFetch(`/discover/${type}`, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recommendations.' });
  }
});

module.exports = router;