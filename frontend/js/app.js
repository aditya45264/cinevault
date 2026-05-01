console.log("✅ app.js is running");

// ========== CONFIG ==========
const API_BASE = 'https://bingebrowse.onrender.com/api';
const TMDB_IMG = 'https://image.tmdb.org/t/p';


// ========== STATE ==========
const state = {
  user: null,
  token: null,
  watchlist: [],
  currentPage: 'home',
  theme: localStorage.getItem('theme') || 'dark'
};


// ========== STORAGE ==========
const storage = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  remove: (key) => localStorage.removeItem(key)
};

// ========== API ==========
const api = {
  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { headers, ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get: (ep) => api.request(ep),
  post: (ep, body) => api.request(ep, { method: 'POST', body: JSON.stringify(body) }),
  put: (ep, body) => api.request(ep, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (ep) => api.request(ep, { method: 'DELETE' })
};

// ========== TOAST ==========
function showToast(message, type = 'info', showTimelineBtn = false) {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span>${message}</span>
    ${showTimelineBtn ? `<button onclick="closeModal(); navigateTo('timeline')" style="background:var(--accent);color:white;border:none;padding:0.3rem 0.75rem;border-radius:6px;font-size:0.75rem;cursor:pointer;margin-left:0.5rem;white-space:nowrap">Go to Timeline</button>` : ''}
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 5000);
}

// ========== THEME ==========
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  localStorage.setItem('theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ========== IMAGE HELPERS ==========
function posterUrl(path, size = 'w342') {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}
function backdropUrl(path) {
  return path ? `${TMDB_IMG}/w1280${path}` : null;
}

// ========== CARD BUILDER ==========
function buildCard(item, mediaType) {
  const type = mediaType || item.media_type || 'movie';
  const title = item.title || item.name || 'Untitled';
  const poster = posterUrl(item.poster_path);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
  const year = (item.release_date || item.first_air_date || '').split('-')[0];
  const id = String(item.id);
  const inWatchlist = state.watchlist.some(w => String(w.movieId) === id);
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    ${poster
      ? `<img class="card-poster" src="${poster}" alt="${title}" loading="lazy">`
      : `<div class="card-poster-placeholder">🎬</div>`}
    <span class="card-badge">${type === 'tv' ? 'TV' : 'Film'}</span>
    <div class="card-overlay">
      <div class="card-actions">
        <button class="card-action-btn watchlist-btn ${inWatchlist ? 'active' : ''}" title="${inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}">
          ${inWatchlist ? '🔖' : '＋'}
        </button>
        <button class="card-action-btn" title="View details">▶</button>
      </div>
    </div>
    <div class="card-info">
      <div class="card-title">${title}</div>
      <div class="card-meta">
        <span class="card-rating">⭐ ${rating}</span>
        <span>${year}</span>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.watchlist-btn')) {
      e.stopPropagation();
      handleWatchlistToggle(item, type, card.querySelector('.watchlist-btn'));
    } else {
      openModal(item.id, type);
    }
  });

  return card;
}

// ========== SKELETON CARDS ==========
function buildSkeletons(count = 8) {
  return Array.from({ length: count }, () => {
    const el = document.createElement('div');
    el.className = 'card-skeleton';
    el.innerHTML = `<div class="sk-poster"></div><div class="sk-body"><div class="sk-title"></div><div class="sk-meta"></div></div>`;
    return el;
  });
}

// ========== RENDER ROW ==========
function renderRow(containerId, items, mediaType) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  if (!items?.length) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:1rem">No content found.</p>';
    return;
  }
  items.forEach(item => el.appendChild(buildCard(item, mediaType)));
}

// ========== WATCHLIST TOGGLE ==========
async function handleWatchlistToggle(item, mediaType, btn) {
  if (!state.user) { showToast('Please log in to use watchlist', 'error'); return navigateTo('login'); }
 const id = String(item.id);
 const inList = state.watchlist.some(w => String(w.movieId) === id);
  try {
    if (inList) {
      await api.delete(`/watchlist/${id}`);
state.watchlist = state.watchlist.filter(w => String(w.movieId) !== id);      showToast('Removed from watchlist', 'info');
      if (btn) { btn.textContent = '＋'; btn.classList.remove('active'); }
    } else {
      const res = await api.post('/watchlist', {
        movieId: id,
        title: item.title || item.name,
        poster: item.poster_path,
        mediaType,
        rating: item.vote_average
      });
      state.watchlist = res.watchlist;
      showToast('Added to watchlist! 🔖', 'success');
      if (btn) { btn.textContent = '🔖'; btn.classList.add('active'); }
    }
    updateWatchlistCount();
  } catch (err) { showToast(err.message, 'error'); }
}

// ========== MODAL ==========
async function openModal(id, mediaType = 'movie') {
  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('movieModal');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modal.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const item = await api.get(`/movies/details/${id}?type=${mediaType}`);
    const revData = await api.get(`/reviews?movieId=${id}`);
    renderModal(item, mediaType, revData);

    // Track watch history
    
  } catch (err) {
    modal.innerHTML = `<div class="empty-state"><div class="empty-state-icon">😕</div><div class="empty-state-title">Failed to load details</div><p>${err.message}</p></div>`;
  }
}

function renderModal(item, mediaType, revData) {
  const modal = document.getElementById('movieModal');
  const title = item.title || item.name;
  const backdrop = backdropUrl(item.backdrop_path);
  const rating = item.vote_average?.toFixed(1) || 'N/A';
  const year = (item.release_date || item.first_air_date || '').split('-')[0];
  const genres = item.genres?.map(g => `<span class="genre-chip">${g.name}</span>`).join('') || '';
  const inWatchlist = state.watchlist.some(w => w.movieId === String(item.id));

  modal.innerHTML = `
    <div class="modal-backdrop" style="background-image:url('${backdrop || ''}')">
      <button class="modal-close" id="modalClose">✕</button>
    </div>
    <div class="modal-body">
      <h2 class="modal-title">${title}</h2>
      <div class="modal-meta">
        <span class="modal-rating">⭐ ${rating}</span>
        <span>📅 ${year}</span>
        ${item.runtime ? `<span>⏱ ${item.runtime} min</span>` : ''}
        ${item.number_of_seasons ? `<span>📺 ${item.number_of_seasons} season${item.number_of_seasons > 1 ? 's' : ''}</span>` : ''}
        <span>🎬 ${mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
      </div>
      <div class="genre-chips" style="margin-bottom:1rem">${genres}</div>
      <p class="modal-overview">${item.overview || 'No description available.'}</p>
      <div class="modal-actions">
  <button class="btn btn-primary watchlist-modal-btn" data-id="${item.id}" data-type="${mediaType}">
    ${inWatchlist ? '🔖 In Watchlist' : '＋ Add to Watchlist'}
  </button>
  <button class="btn btn-secondary watched-modal-btn" data-id="${item.id}" data-type="${mediaType}" data-title="${title}" data-poster="${item.poster_path || ''}">
    👁️ Mark as Watched
  </button>
  ${item.videos?.results?.[0] ? `<a href="https://www.youtube.com/watch?v=${item.videos.results[0].key}" target="_blank" class="btn btn-secondary">▶ Trailer</a>` : ''}
</div>
      <div class="reviews-section">
        <div class="reviews-title">💬 Reviews <span style="color:var(--text-muted);font-weight:400;font-size:0.85rem">(${revData.total})</span></div>
        ${revData.total > 0 ? `
          <div class="avg-rating-display">
            <div class="avg-number">${revData.avgRating}</div>
            <div>
              <div class="avg-stars">${'⭐'.repeat(Math.round(revData.avgRating))}</div>
              <div class="avg-count">${revData.total} review${revData.total !== 1 ? 's' : ''}</div>
            </div>
          </div>` : ''}
        ${state.user ? `
          <div class="review-form" id="reviewForm" data-movie="${item.id}" data-type="${mediaType}">
            <div class="star-rating" id="starRating">
              ${[1,2,3,4,5].map(n => `<span class="star" data-val="${n}">★</span>`).join('')}
            </div>
            <textarea class="review-textarea" id="reviewComment" placeholder="Share your thoughts..."></textarea>
            <button class="btn btn-primary btn-sm" id="submitReview">Submit Review</button>
          </div>` : `<p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1rem"><a href="#" onclick="navigateTo('login')" style="color:var(--accent)">Log in</a> to write a review.</p>`}
        <div id="reviewsList">
          ${revData.reviews.map(r => reviewCard(r)).join('') || '<p style="color:var(--text-muted);font-size:0.875rem">No reviews yet. Be the first!</p>'}
        </div>
      </div>
    </div>
  `;

 document.getElementById('modalClose')?.addEventListener('click', closeModal);
  setupStarRating();
  setupReviewSubmit(item.id, mediaType);

  const wBtn = modal.querySelector('.watchlist-modal-btn');
if (wBtn) wBtn.addEventListener('click', () => handleWatchlistToggle(item, mediaType, null));

const watchedBtn = modal.querySelector('.watched-modal-btn');
if (watchedBtn) watchedBtn.addEventListener('click', () => {
  api.post('/history', {
    movieId: String(item.id),
    title: item.title || item.name,
    poster: item.poster_path,
    mediaType,
    rating: item.vote_average
  }).then(() => {
    showToast('Marked as watched! 👁️ Want to add it to your timeline?', 'info', true);
  }).catch(err => showToast(err.message, 'error'));
});
}

function reviewCard(r) {
  const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
  const initials = r.userName?.charAt(0).toUpperCase() || '?';
  const date = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `
    <div class="review-item">
      <div class="review-header">
        <div class="reviewer-avatar">${initials}</div>
        <span class="reviewer-name">${r.userName}</span>
        <span class="review-stars">${stars}</span>
      </div>
      ${r.comment ? `<p class="review-comment">${r.comment}</p>` : ''}
      <div class="review-date">${date}</div>
    </div>`;
}

function setupStarRating() {
  const stars = document.querySelectorAll('#starRating .star');
  let selected = 0;
  stars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = +star.dataset.val;
      stars.forEach(s => s.classList.toggle('hover', +s.dataset.val <= val));
    });
    star.addEventListener('mouseleave', () => {
      stars.forEach(s => { s.classList.remove('hover'); s.classList.toggle('active', +s.dataset.val <= selected); });
    });
    star.addEventListener('click', () => {
      selected = +star.dataset.val;
      stars.forEach(s => s.classList.toggle('active', +s.dataset.val <= selected));
      star.closest('#starRating').dataset.rating = selected;
    });
  });
}

function setupReviewSubmit(movieId, mediaType) {
  const btn = document.getElementById('submitReview');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const rating = +document.getElementById('starRating')?.dataset.rating;
    const comment = document.getElementById('reviewComment')?.value.trim();
    if (!rating) return showToast('Please select a star rating', 'error');
    try {
      btn.disabled = true; btn.textContent = 'Submitting...';
      const res = await api.post('/reviews', { movieId: String(movieId), mediaType, rating, comment });
      showToast('Review submitted! 🌟', 'success');
      const reviewsList = document.getElementById('reviewsList');
      reviewsList.insertAdjacentHTML('afterbegin', reviewCard(res.review));
    } catch (err) { showToast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Submit Review'; }
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ========== AUTH ==========
function setUser(user, token) {
  state.user = user; state.token = token;
  storage.set('user', user); storage.set('token', token);
  updateNavAuth();
}

function logout() {
  state.user = null; state.token = null; state.watchlist = [];
  storage.remove('user'); storage.remove('token');
  updateNavAuth();
  navigateTo('home');
  showToast('Logged out. See you soon! 👋', 'info');
}

function updateNavAuth() {
  const loginLink = document.getElementById('navLogin');
  const registerLink = document.getElementById('navRegister');
  const dashboardLink = document.getElementById('navDashboard');
  const watchlistLink = document.getElementById('navWatchlist');
  const timelineLink = document.getElementById('navTimeline');
  const userMenu = document.getElementById('userMenu');
  const navUser = document.getElementById('navUserName');

 if (state.user) {
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
    if (dashboardLink) dashboardLink.style.display = '';
    if (watchlistLink) watchlistLink.style.display = '';
    if (timelineLink) timelineLink.style.display = '';
    if (userMenu) userMenu.style.display = 'flex';
    if (state.user.avatar) {
      if (userMenu) {
        userMenu.style.backgroundImage = `url(${state.user.avatar})`;
        userMenu.style.backgroundSize = 'cover';
        userMenu.style.backgroundPosition = 'center';
      }
      if (navUser) navUser.textContent = '';
    } else {
      if (navUser) navUser.textContent = state.user.name?.charAt(0).toUpperCase();
    }
  } else {
    if (loginLink) loginLink.style.display = '';
    if (registerLink) registerLink.style.display = '';
    if (dashboardLink) dashboardLink.style.display = 'none';
    if (watchlistLink) watchlistLink.style.display = 'none';
    if (timelineLink) timelineLink.style.display = 'none';
    if (userMenu) userMenu.style.display = 'none';
  }
}

function updateWatchlistCount() {
  const el = document.getElementById('watchlistCount');
  if (el) el.textContent = state.watchlist.length;
}

// ========== ROUTER ==========
function navigateTo(page, push = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) {
    pageEl.classList.add('active');
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const navLink = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');

  state.currentPage = page;

  if (push) history.pushState({ page }, '', `#${page}`);

  document.getElementById('navLinks')?.classList.remove('open');

  loadPage(page);
}
 



async function loadPage(page) {
  switch (page) {
    case 'home': await loadHome(); break;
    case 'dashboard': await loadDashboard(); break;
    case 'explore': await loadExplore(); break;
    case 'watchlist': await loadWatchlistPage(); break;
    case 'timeline': await loadTimeline(); break;
    case 'profile': await loadProfile(); break;
    case 'quiz': initQuiz(); break;
  }
}

function renderHero(item) {
  const bg = document.getElementById('heroBg');
  const title = document.getElementById('heroTitle');
  const rating = document.getElementById('heroRating');
  const overview = document.getElementById('heroOverview');
  const year = document.getElementById('heroYear');
  const btn = document.getElementById('heroDetails');

  if (bg) bg.style.backgroundImage = `url('${backdropUrl(item.backdrop_path)}')`;
  if (title) title.textContent = item.title || item.name;
  if (rating) rating.textContent = `⭐ ${item.vote_average?.toFixed(1)}`;
  if (year) year.textContent = (item.release_date || item.first_air_date || '').split('-')[0];
  if (overview) overview.textContent = item.overview;
  if (btn) btn.onclick = () => openModal(item.id, item.media_type || 'movie');
}

// ========== HOME PAGE ==========
async function loadHome() {
  try {
    // Hero - auto rotating
    const heroData = await api.get('/movies/trending?media_type=movie&time_window=day');
    const heroes = heroData.results?.slice(0, 5);
    if (heroes?.length) {
      let heroIndex = 0;
      renderHero(heroes[0]);
      setInterval(() => {
        heroIndex = (heroIndex + 1) % heroes.length;
        const heroBg = document.getElementById('heroBg');
        if (heroBg) heroBg.style.opacity = '0';
        setTimeout(() => {
          renderHero(heroes[heroIndex]);
          if (heroBg) heroBg.style.opacity = '1';
        }, 500);
      }, 5000);
    }

    // Trending
    const trendingEl = document.getElementById('trendingRow');
    buildSkeletons(8).forEach(s => trendingEl.appendChild(s));
    const trending = await api.get('/movies/trending');
    renderRow('trendingRow', trending.results);

    // Popular Movies
    const popMovieEl = document.getElementById('popularMoviesRow');
    buildSkeletons(8).forEach(s => popMovieEl.appendChild(s));
    const popMovies = await api.get('/movies/popular?type=movie');
    renderRow('popularMoviesRow', popMovies.results, 'movie');

    // Popular TV
    const popTVEl = document.getElementById('popularTVRow');
    buildSkeletons(8).forEach(s => popTVEl.appendChild(s));
    const popTV = await api.get('/movies/popular?type=tv');
    renderRow('popularTVRow', popTV.results, 'tv');

    // Top Rated
    const topEl = document.getElementById('topRatedRow');
    buildSkeletons(8).forEach(s => topEl.appendChild(s));
    const topRated = await api.get('/movies/top-rated?type=movie');
    renderRow('topRatedRow', topRated.results, 'movie');

  } catch (err) {
    console.error('loadHome error:', err);
    showToast('Failed to load content. Check your API key.', 'error');
  }
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  if (!state.user) return navigateTo('login');
  const nameEl = document.getElementById('dashName');
  if (nameEl) nameEl.textContent = state.user.name;

  try {
    const wl = await api.get('/watchlist');
    state.watchlist = wl.watchlist;
    updateWatchlistCount();
    const countEl = document.getElementById('dashWatchlistCount');
    if (countEl) countEl.textContent = wl.watchlist.length;

    const recentRow = document.getElementById('dashRecentRow');
    if (recentRow) {
      const recent = await api.get('/movies/trending?media_type=all&time_window=day');
      renderRow('dashRecentRow', recent.results?.slice(0, 10));
    }
  } catch(err) { showToast(err.message, 'error'); }
}
// ========== EXPLORE ==========
let exploreType = 'movie', explorePage = 1, exploreGenre = null, searchTimer = null;

async function loadExplore(reset = true) {
  if (reset) { explorePage = 1; }
  const grid = document.getElementById('exploreGrid');
  if (!grid) return;
  if (reset) {
    grid.innerHTML = '';
    buildSkeletons(12).forEach(s => grid.appendChild(s));
  }

  try {
    let data;
    const searchVal = document.getElementById('exploreSearch')?.value.trim();
    if (searchVal) {
      data = await api.get(`/movies/search?query=${encodeURIComponent(searchVal)}&page=${explorePage}`);
    } else if (exploreGenre) {
      data = await api.get(`/movies/by-genre?genre_id=${exploreGenre}&type=${exploreType}&page=${explorePage}`);
    } else {
      const tab = document.querySelector('#exploreTabs .tab-btn.active')?.dataset.tab || 'popular';
      data = await api.get(`/movies/${tab}?type=${exploreType}&page=${explorePage}`);
    }

    if (reset) grid.innerHTML = '';
    data.results?.forEach(item => grid.appendChild(buildCard(item, exploreType)));
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">😕</div><p>${err.message}</p></div>`;
  }
}

async function loadGenreFilters() {
  try {
    const data = await api.get(`/movies/genres?type=${exploreType}`);
    const container = document.getElementById('genreFilters');
    if (!container) return;
    container.innerHTML = `<button class="filter-btn active" data-genre="">All</button>`;
    data.genres?.forEach(g => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.genre = g.id;
      btn.textContent = g.name;
      btn.addEventListener('click', () => {
        document.querySelectorAll('#genreFilters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        exploreGenre = g.id;
        loadExplore();
      });
      container.appendChild(btn);
    });
    container.querySelector('[data-genre=""]').addEventListener('click', (e) => {
      document.querySelectorAll('#genreFilters .filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      exploreGenre = null;
      loadExplore();
    });
  } catch (err) {}
}

// ========== WATCHLIST PAGE ==========
async function loadWatchlistPage() {
  if (!state.user) return navigateTo('login');
  const grid = document.getElementById('watchlistGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const data = await api.get('/watchlist');
    state.watchlist = data.watchlist;
    updateWatchlistCount();
    renderWatchlistGrid(data.watchlist);
  } catch (err) {
    showToast(err.message, 'error');
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">😕</div><p>${err.message}</p></div>`;
  }
}

function renderWatchlistGrid(items) {
  const grid = document.getElementById('watchlistGrid');
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🎬</div><div class="empty-state-title">Your watchlist is empty</div><p>Explore content and add movies or shows to your watchlist.</p><button class="btn btn-primary" style="margin-top:1rem" onclick="navigateTo('explore')">Explore Now</button></div>`;
    return;
  }
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'watchlist-card';
    card.innerHTML = `
      ${item.poster
        ? `<img class="watchlist-card-poster" src="${posterUrl(item.poster)}" alt="${item.title}" loading="lazy">`
        : `<div class="watchlist-card-poster" style="display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--surface)">🎬</div>`}
      <div class="watchlist-card-body">
        <div class="watchlist-card-title">${item.title}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem">${item.mediaType === 'tv' ? '📺 TV Show' : '🎬 Movie'}</div>
        ${item.rating ? `<div style="color:var(--gold);font-size:0.8rem">⭐ ${item.rating?.toFixed(1)}</div>` : ''}
        <div class="watchlist-card-footer">
          <button class="remove-btn" data-id="${item.movieId}">🗑 Remove</button>
          <button class="btn btn-ghost btn-sm" onclick="openModal(${item.movieId}, '${item.mediaType}')">Details</button>
        </div>
      </div>
    `;
    card.querySelector('.remove-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await api.delete(`/watchlist/${item.movieId}`);
        state.watchlist = state.watchlist.filter(w => w.movieId !== item.movieId);
        updateWatchlistCount();
        card.style.animation = 'fadeIn 0.3s ease reverse';
        card.addEventListener('animationend', () => { card.remove(); if (!grid.children.length || (grid.children.length === 1 && grid.children[0].className === 'empty-state')) renderWatchlistGrid([]); });
        showToast('Removed from watchlist', 'info');
      } catch(err) { showToast(err.message, 'error'); }
    });
    grid.appendChild(card);
  });
}

// ========== PROFILE PAGE ==========
async function loadProfile() {
  if (!state.user) return navigateTo('login');

  // Setup avatar upload
  const avatarEl = document.getElementById('profileAvatar');
  const avatarInput = document.getElementById('avatarInput');

  avatarEl?.addEventListener('click', () => avatarInput?.click());

  avatarInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        const res = await api.put('/auth/profile', { avatar: base64 });
        state.user = res.user;
        storage.set('user', res.user);
        if (avatarEl) {
          avatarEl.style.backgroundImage = `url(${base64})`;
          avatarEl.style.backgroundSize = 'cover';
          avatarEl.style.backgroundPosition = 'center';
          avatarEl.textContent = '';
        }
        const navAvatar = document.getElementById('userMenu');
        if (navAvatar) {
          navAvatar.style.backgroundImage = `url(${base64})`;
          navAvatar.style.backgroundSize = 'cover';
          navAvatar.style.backgroundPosition = 'center';
          document.getElementById('navUserName').textContent = '';
        }
        showToast('Profile picture updated! 📸', 'success');
      } catch(err) {
        showToast(err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  });

  const nameEl = document.getElementById('profileName');
  const emailEl = document.getElementById('profileEmail');
  const joinedEl = document.getElementById('profileJoined');
  if (nameEl) nameEl.textContent = state.user.name;
  if (emailEl) emailEl.textContent = state.user.email;
  if (avatarEl) avatarEl.textContent = state.user.name?.charAt(0).toUpperCase();
  if (joinedEl) joinedEl.textContent = `Member since ${new Date(state.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

  try {
    const wl = await api.get('/watchlist');
    const wlCountEl = document.getElementById('profileWatchlistCount');
    if (wlCountEl) wlCountEl.textContent = wl.watchlist.length;
  } catch {}

  const editName = document.getElementById('editName');
  const editEmail = document.getElementById('editEmail');
  if (editName) editName.value = state.user.name || '';
  if (editEmail) editEmail.value = state.user.email || '';

  if (state.user.avatar) {
    if (avatarEl) {
      avatarEl.style.backgroundImage = `url(${state.user.avatar})`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.textContent = '';
    }
  }
}

// ========== QUIZ ==========
const quizQuestions = [
  {
    title: "What's your favorite genre?",
    subtitle: "Pick the type of content you enjoy most",
    options: [
      { emoji: '💥', label: 'Action & Adventure', desc: 'Thrills, explosions, heroes', genres: [28, 12] },
      { emoji: '😂', label: 'Comedy', desc: 'Laughs and good vibes', genres: [35] },
      { emoji: '🕵️', label: 'Thriller & Crime', desc: 'Mystery and suspense', genres: [53, 80] },
      { emoji: '❤️', label: 'Romance & Drama', desc: 'Emotional stories', genres: [10749, 18] }
    ]
  },
  {
    title: "What's your mood right now?",
    subtitle: "We'll match content to how you feel",
    options: [
      { emoji: '😄', label: 'Happy & Fun', desc: 'Lighthearted entertainment', genres: [35, 16] },
      { emoji: '😢', label: 'Emotional', desc: 'Something touching', genres: [18, 10749] },
      { emoji: '😰', label: 'Suspenseful', desc: 'Edge of my seat', genres: [53, 27] },
      { emoji: '😌', label: 'Chill & Relaxed', desc: 'Easy watching', genres: [99, 36] }
    ]
  },
  {
    title: "How much time do you have?",
    subtitle: "We'll pick the right length",
    options: [
      { emoji: '⚡', label: 'Under 90 mins', desc: 'Quick watch', type: 'movie' },
      { emoji: '🍿', label: '90-120 mins', desc: 'Standard movie', type: 'movie' },
      { emoji: '📺', label: 'Multiple episodes', desc: 'TV series binge', type: 'tv' },
      { emoji: '🌙', label: 'All night long', desc: 'Long series', type: 'tv' }
    ]
  },
  {
    
    title: "Preferred language?",
    subtitle: "Pick your preferred film industry",
    options: [
      { emoji: '🎬', label: 'Hollywood', desc: 'English language films', language: 'en' },
      { emoji: '🇮🇳', label: 'Bollywood', desc: 'Hindi language films', language: 'hi' },
      { emoji: '🇰🇷', label: 'Korean', desc: 'K-dramas and films', language: 'ko' },
      { emoji: '🌍', label: 'Any language', desc: "Doesn't matter", language: null }
    ]
  },
  {
    title: "What era do you prefer?",
    subtitle: "Pick your favorite decade",
    options: [
      { emoji: '🎞️', label: 'Classic', desc: 'Pre-2000 masterpieces', era: 'classic' },
      { emoji: '📼', label: '2000s', desc: 'Early 2000s hits', era: '2000s' },
      { emoji: '📱', label: '2010s', desc: 'Modern classics', era: '2010s' },
      { emoji: '🆕', label: 'Latest', desc: '2020s and beyond', era: 'latest' }
    ]
  },
  {
    title: "Who are you watching with?",
    subtitle: "We'll pick something everyone will enjoy",
    options: [
      { emoji: '🧍', label: 'Alone', desc: 'Just me, myself & I', genres: [53, 27, 878] },
      { emoji: '💑', label: 'Partner', desc: 'Date night vibes', genres: [10749, 35] },
      { emoji: '👨‍👩‍👧', label: 'Family', desc: 'All ages welcome', genres: [10751, 16, 35] },
      { emoji: '👫', label: 'Friends', desc: 'Group entertainment', genres: [28, 35, 12] }
    ]
  },
  {
    title: "Content rating preference?",
    subtitle: "How intense can it get?",
    options: [
      { emoji: '👨‍👩‍👧', label: 'Family Friendly', desc: 'Safe for all ages', rating: 'family' },
      { emoji: '🧑', label: 'Teen', desc: 'PG-13 content', rating: 'teen' },
      { emoji: '🔞', label: 'Adult', desc: 'Mature themes', rating: 'adult' },
      { emoji: '🤷', label: "Doesn't Matter", desc: 'Anything goes', rating: null }
    ]
  },
  {
    title: "How do you like your ending?",
    subtitle: "Pick your preferred conclusion",
    options: [
      { emoji: '😊', label: 'Happy Ending', desc: 'Feel good finale', genres: [35, 10749] },
      { emoji: '😮', label: 'Twist Ending', desc: 'Surprise me!', genres: [53, 9648] },
      { emoji: '😢', label: 'Bittersweet', desc: 'Emotional and real', genres: [18] },
      { emoji: '🤷', label: "Doesn't Matter", desc: 'Just a good story', genres: [] }
    ]
  },
  {
    title: "What's it based on?",
    subtitle: "Pick your preferred source material",
    options: [
      { emoji: '📰', label: 'True Story', desc: 'Based on real events', genres: [36, 99] },
      { emoji: '📚', label: 'Book Adaptation', desc: 'From a great novel', genres: [18] },
      { emoji: '✍️', label: 'Original Screenplay', desc: 'Purely imaginative', genres: [878, 14] },
      { emoji: '🤷', label: "Doesn't Matter", desc: 'Story is what counts', genres: [] }
    ]
  },
  {
    title: "Animation or live action?",
    subtitle: "Pick your preferred format",
    options: [
      { emoji: '🎨', label: 'Animation', desc: 'Animated films & shows', genres: [16] },
      { emoji: '🎭', label: 'Live Action', desc: 'Real actors', genres: [] },
      { emoji: '🖥️', label: 'CGI Heavy', desc: 'Visual spectacles', genres: [28, 878] },
      { emoji: '🤷', label: "Doesn't Matter", desc: 'Content over format', genres: [] }
    ]
  }
];

let quizAnswers = [];
let quizStep = 0;

function initQuiz() {
  quizAnswers = [];
  quizStep = 0;
  renderQuizStep();
}

function renderQuizStep() {
  const container = document.getElementById('quizContent');
  if (!container) return;

  if (quizStep >= quizQuestions.length) {
    renderQuizResults();
    return;
  }

  const q = quizQuestions[quizStep];
  container.innerHTML = `
    <div class="quiz-progress">
      ${quizQuestions.map((_, i) => `<div class="progress-dot ${i < quizStep ? 'done' : i === quizStep ? 'active' : ''}"></div>`).join('')}
    </div>
    <div class="quiz-question-title">${q.title}</div>
    <div class="quiz-question-subtitle">${q.subtitle}</div>
    <div class="quiz-options">
      ${q.options.map((opt, i) => `
        <div class="quiz-option" data-idx="${i}">
          <div class="quiz-option-emoji">${opt.emoji}</div>
          <div class="quiz-option-label">${opt.label}</div>
          <div class="quiz-option-desc">${opt.desc}</div>
        </div>
      `).join('')}
    </div>
    <div class="quiz-nav">
      ${quizStep > 0 ? `<button class="btn btn-ghost" id="quizBack">← Back</button>` : `<span></span>`}
      <button class="btn btn-primary" id="quizNext" disabled>Next →</button>
    </div>
  `;

  let selected = null;
  container.querySelectorAll('.quiz-option').forEach(opt => {
    opt.addEventListener('click', () => {
      container.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selected = +opt.dataset.idx;
      document.getElementById('quizNext').disabled = false;
    });
  });

  document.getElementById('quizNext')?.addEventListener('click', () => {
    if (selected === null) return;
    quizAnswers[quizStep] = q.options[selected];
    quizStep++;
    renderQuizStep();
  });

  document.getElementById('quizBack')?.addEventListener('click', () => {
    quizStep--;
    renderQuizStep();
  });
}

async function renderQuizResults() {
  const container = document.getElementById('quizContent');
  container.innerHTML = '<div class="loading-spinner"></div>';

  const mediaType = quizAnswers[2]?.type || 'movie';

  const langAnswer = quizAnswers.find(a => a.hasOwnProperty('language'));
  const language = langAnswer?.language || null;

  const eraAnswer = quizAnswers.find(a => a.hasOwnProperty('era'));
  const era = eraAnswer?.era || null;

  let yearFrom = null, yearTo = null;
  if (era === 'classic') { yearFrom = 1900; yearTo = 1999; }
else if (era === '2000s') { yearFrom = 2000; yearTo = 2012; }
else if (era === '2010s') { yearFrom = 2008; yearTo = 2019; }
else if (era === 'latest') { yearFrom = 2018; yearTo = new Date().getFullYear(); }
  const animAnswer = quizAnswers.find(a => a.label === 'Animation' || a.label === 'Live Action' || a.label === 'CGI Heavy');
  const isAnimation = animAnswer?.label === 'Animation';
  const isLiveAction = animAnswer?.label === 'Live Action';

  let allGenres = quizAnswers[0]?.genres || [];
  if (isLiveAction) allGenres = allGenres.filter(g => g !== 16);
  if (isAnimation) allGenres = [16];

  const uniqueGenres = [...new Set(allGenres)].filter(g => g).slice(0, 3).join(',');
  // Map movie genres to TV genre equivalents
const tvGenreMap = { 
  28: 10759, 
  12: 10759, 
  53: 9648, 
  80: 80, 
  35: 35, 
  18: 18, 
  10749: 10749, 
  16: 16, 
  99: 99, 
  36: 36,
  27: 9648
};
  const tvGenres = mediaType === 'tv' 
  ? [...new Set(allGenres.map(g => tvGenreMap[g] || g))].join(',')
  : uniqueGenres;

  async function fetchRecommendations(useLanguage, useYear) {
    let query = `/movies/recommend?type=${mediaType}`;
    const genresToUse = mediaType === 'tv' ? tvGenres : uniqueGenres;
    if (genresToUse) query += `&genres=${genresToUse}`;
    if (useLanguage && language) query += `&language=${language}`;
    if (useYear && yearFrom) query += `&year_from=${yearFrom}&year_to=${yearTo}`;
    console.log('Fetching:', query);
    const page1 = await api.get(query);
    const page2 = await api.get(query + '&page=2');
    return { ...page1, results: [...(page1.results || []), ...(page2.results || [])] };
  }

  try {
    let data = await fetchRecommendations(true, true);
    console.log('Results:', data.total_results, data.results?.length);

    if (!data.results?.length) data = await fetchRecommendations(false, true);
    if (!data.results?.length) data = await fetchRecommendations(true, false);
    if (!data.results?.length) data = await fetchRecommendations(false, false);

    container.innerHTML = `
      <div class="quiz-results">
        <div class="quiz-results-title">🎯 Your Perfect Picks</div>
        <div class="quiz-results-subtitle">Based on your preferences, here's what we recommend</div>
        <div class="content-grid" id="quizResultsGrid"></div>
        <div style="text-align:center;margin-top:2rem">
          <button class="btn btn-ghost" onclick="initQuiz()">↺ Take Again</button>
        </div>
      </div>
    `;
    data.results?.slice(0, 20).forEach(item => {
      document.getElementById('quizResultsGrid').appendChild(buildCard(item, mediaType));
    });
  } catch(err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">😕</div><div class="empty-state-title">Couldn't load recommendations</div><button class="btn btn-primary" onclick="initQuiz()">Try Again</button></div>`;
  }
}

// ========== AUTH FORMS ==========
function setupAuthForms() {
  // Register
  document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const age = parseInt(document.getElementById('regAge').value);
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;
  const btn = e.target.querySelector('button[type="submit"]');

  clearFormErrors('registerForm');

  if (password !== confirmPassword) {
    return showFormError('registerForm', 'Passwords do not match');
  }
  if (age < 13) {
    return showFormError('registerForm', 'You must be at least 13 years old');
  }

  btn.disabled = true; btn.textContent = 'Creating Account...';
  try {
    const res = await api.post('/auth/register', { name, email, age, password });
    setUser(res.user, res.token);
    showToast(`Welcome, ${res.user.name}! 🎉`, 'success');
    navigateTo('dashboard');
  } catch(err) {
    showFormError('registerForm', err.message);
  } finally { btn.disabled = false; btn.textContent = 'Create Account'; }
});

  // Login
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Signing In...';
    clearFormErrors('loginForm');
    try {
      const res = await api.post('/auth/login', { email, password });
      setUser(res.user, res.token);
      const wl = await api.get('/watchlist');
      state.watchlist = wl.watchlist;
      updateWatchlistCount();
      showToast(`Welcome back, ${res.user.name}! 👋`, 'success');
      navigateTo('dashboard');
    } catch(err) {
      showFormError('loginForm', err.message);
    } finally { btn.disabled = false; btn.textContent = 'Sign In'; }
  });
}

function showFormError(formId, msg) {
  const errEl = document.querySelector(`#${formId} .form-error`);
  if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
}
function clearFormErrors(formId) {
  document.querySelectorAll(`#${formId} .form-error`).forEach(el => el.classList.remove('show'));
}


// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {

  // Search button
  document.getElementById('searchBtn')?.addEventListener('click', () => {
    navigateTo('explore');
    const input = document.getElementById('exploreSearch');
    if (input) input.focus();
  });

  // Load saved session
  const savedUser = storage.get('user');
  const savedToken = storage.get('token');
  if (savedUser && savedToken) {
    state.user = savedUser; state.token = savedToken;
    api.get('/auth/profile').then(res => {
      state.user = res.user; storage.set('user', res.user);
      updateNavAuth();
      api.get('/watchlist').then(wl => { state.watchlist = wl.watchlist; updateWatchlistCount(); }).catch(() => {});
    }).catch(() => { state.user = null; state.token = null; storage.remove('user'); storage.remove('token'); updateNavAuth(); });
  }

  applyTheme(state.theme);
  updateNavAuth();
  setupAuthForms();
  setupEditProfile();
  

  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  // Nav links
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.currentTarget.dataset.page;
      const protectedPages = ['dashboard','watchlist','profile'];
      if (protectedPages.includes(page) && !state.user) {
        showToast('Please log in first', 'error');
        return navigateTo('login');
      }
      navigateTo(page);
    });
  });

  // Hamburger
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });

  // Modal close on overlay click
  document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // User dropdown
  document.getElementById('userMenu')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userDropdown')?.classList.toggle('open');
  });
  document.addEventListener('click', () => document.getElementById('userDropdown')?.classList.remove('open'));

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });

  // Navbar scroll
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Explore tabs
  document.querySelectorAll('#exploreTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#exploreTabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadExplore();
    });
  });

  // Explore type toggle
  document.querySelectorAll('#exploreTypeFilter .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#exploreTypeFilter .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      exploreType = btn.dataset.type;
      exploreGenre = null;
      loadGenreFilters();
      loadExplore();
    });
  });

  // Search input
// Search
  document.getElementById('exploreSearch')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadExplore(), 600);
  });

  document.getElementById('exploreSearch')?.addEventListener('focus', async (e) => {
    const val = e.target.value.trim();
    if (val.length >= 2) showSearchSuggestions(val);
  });

  

  // Load more
  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    explorePage++; loadExplore(false);
  });

  // Back/forward
  window.addEventListener('popstate', (e) => {
    const page = e.state?.page || 'home';
    navigateTo(page, false);
  });

  // Initial page load
  const hash = location.hash.replace('#', '');
  const validPages = ['home','explore','quiz','login','register','dashboard','watchlist','profile'];
  const page = validPages.includes(hash) ? hash : 'home';
  navigateTo(page, false);

  // Hide loading overlay
  document.getElementById('loadingOverlay')?.classList.add('hidden');

}); // ← single closing bracket for DOMContentLoaded

function setupEditProfile() {
  document.getElementById('editProfileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const currentPassword = document.getElementById('editCurrentPassword').value;
    const newPassword = document.getElementById('editNewPassword').value;
    const confirmNewPassword = document.getElementById('editConfirmNewPassword').value;
    const errEl = document.getElementById('editProfileError');
    errEl.classList.remove('show');

    if (newPassword && newPassword !== confirmNewPassword) {
      errEl.textContent = 'New passwords do not match';
      errEl.classList.add('show');
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const body = {};
      if (name) body.name = name;
      if (email) body.email = email;
      if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }

      const res = await api.put('/auth/profile', body);
      state.user = res.user;
      storage.set('user', res.user);
      updateNavAuth();
      showToast('Profile updated! ✅', 'success');

      // Refresh profile page
      loadProfile();
    } catch(err) {
      errEl.textContent = err.message;
      errEl.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });
}

function setupAvatarUpload() {
  const avatarEl = document.getElementById('profileAvatar');
  const avatarInput = document.getElementById('avatarInput');

  avatarEl?.addEventListener('click', () => avatarInput?.click());

  avatarInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;

      try {
        const res = await api.put('/auth/profile', { avatar: base64 });
        state.user = res.user;
        storage.set('user', res.user);

        // Update avatar display
        if (avatarEl) {
          avatarEl.style.backgroundImage = `url(${base64})`;
          avatarEl.style.backgroundSize = 'cover';
          avatarEl.style.backgroundPosition = 'center';
          avatarEl.textContent = '';
        }

        // Update navbar avatar
        const navAvatar = document.getElementById('userMenu');
        if (navAvatar) {
          navAvatar.style.backgroundImage = `url(${base64})`;
          navAvatar.style.backgroundSize = 'cover';
          navAvatar.style.backgroundPosition = 'center';
          document.getElementById('navUserName').textContent = '';
        }

        showToast('Profile picture updated! 📸', 'success');
      } catch(err) {
        showToast(err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  });
}

// ========== TIMELINE ==========
async function loadTimeline() {
  if (!state.user) return navigateTo('login');
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  // Set default date to today
  const dateInput = document.getElementById('timelineDate');
if (dateInput) {
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  dateInput.max = today;
}

  // Search functionality
  let searchTimer = null;
  let selectedMovie = null;

  document.getElementById('timelineSearch')?.addEventListener('input', async (e) => {
    clearTimeout(searchTimer);
    const val = e.target.value.trim();
    if (val.length < 2) {
      document.getElementById('timelineSearchResults').innerHTML = '';
      return;
    }
    searchTimer = setTimeout(async () => {
      const data = await api.get(`/movies/search?query=${encodeURIComponent(val)}&page=1`);
      const results = data.results?.slice(0, 5);
      const resultsEl = document.getElementById('timelineSearchResults');
      resultsEl.innerHTML = results.map(item => `
        <div class="suggestion-item" data-id="${item.id}" data-type="${item.media_type || 'movie'}" data-title="${item.title || item.name}" data-poster="${item.poster_path || ''}" data-rating="${item.vote_average || 0}" style="border-radius:var(--radius-sm);margin-bottom:0.25rem">
          ${item.poster_path ? `<img src="https://image.tmdb.org/t/p/w92${item.poster_path}" style="width:32px;height:48px;object-fit:cover;border-radius:4px">` : '<div style="width:32px;height:48px;background:var(--surface);border-radius:4px"></div>'}
          <div style="flex:1">
            <div style="font-size:0.875rem;font-weight:600">${item.title || item.name}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${(item.release_date || item.first_air_date || '').split('-')[0]}</div>
          </div>
        </div>
      `).join('');

      resultsEl.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
          selectedMovie = {
            movieId: el.dataset.id,
            mediaType: el.dataset.type,
            title: el.dataset.title,
            poster: el.dataset.poster,
            rating: parseFloat(el.dataset.rating)
          };
          document.getElementById('timelineSearch').value = el.dataset.title;
          resultsEl.innerHTML = '';
        });
      });
    }, 400);
  });

  document.getElementById('timelineAddBtn')?.addEventListener('click', async () => {
    if (!selectedMovie) return showToast('Please select a movie first', 'error');
    const date = document.getElementById('timelineDate').value;
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
      showToast('Cannot set a future date', 'error');
      return;
    }
    try {
      await api.post('/history', {
        ...selectedMovie,
        watchedAt: date ? new Date(date).toISOString() : new Date().toISOString()
      });
      showToast('Added to timeline! 📅', 'success');
      selectedMovie = null;
      document.getElementById('timelineSearch').value = '';
      fetchTimeline();
    } catch(err) {
      showToast(err.message, 'error');
    }
  });

  fetchTimeline();
}

async function fetchTimeline() {
  const container = document.getElementById('timelineContainer');
  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const data = await api.get('/history');
    if (!data.timeline?.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <div class="empty-state-title">No activity yet</div>
          <p>Mark movies as watched or add them above to build your timeline.</p>
        </div>`;
      return;
    }

    const grouped = {};
    data.timeline.forEach(item => {
      const date = new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

    container.innerHTML = Object.entries(grouped).map(([date, items]) => `
  <div class="timeline-group">
    <div class="timeline-date">${date}</div>
    ${items.map(item => `
      <div class="timeline-item">
        <div class="timeline-icon" onclick="openModal('${item.movieId}', '${item.mediaType || 'movie'}')" style="cursor:pointer">${item.type === 'watched' ? '👁️' : '⭐'}</div>
        <div class="timeline-content" onclick="openModal('${item.movieId}', '${item.mediaType || 'movie'}')" style="cursor:pointer">
          <div class="timeline-title">${item.title}</div>
          <div class="timeline-meta">
            ${item.type === 'watched' ? '🎬 Watched' : `⭐ Reviewed — ${item.rating}/5`}
            ${item.comment ? `<span style="color:var(--text-muted)"> — "${item.comment.substring(0, 50)}${item.comment.length > 50 ? '...' : ''}"</span>` : ''}
          </div>
        </div>
        ${item.poster ? `<img src="https://image.tmdb.org/t/p/w92${item.poster}" style="width:40px;height:60px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer" onclick="openModal('${item.movieId}', '${item.mediaType || 'movie'}')">` : ''}
        ${item.type === 'watched' ? `
          <div style="display:flex;flex-direction:column;gap:0.5rem;flex-shrink:0">
            <input type="date" value="${new Date(item.date).toISOString().split('T')[0]}" max="${new Date().toISOString().split('T')[0]}"              style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.3rem 0.5rem;color:var(--text-primary);font-size:0.75rem;cursor:pointer"
              onchange="updateTimelineDate('${item.movieId}', this.value)" />
            <button onclick="deleteFromTimeline('${item.movieId}')" 
              style="background:rgba(244,67,54,0.1);color:var(--error);border:none;padding:0.3rem 0.5rem;border-radius:var(--radius-sm);font-size:0.75rem;cursor:pointer">
              🗑 Remove
            </button>
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
`).join('');
  } catch(err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">😕</div><p>${err.message}</p></div>`;
  }
}

async function updateTimelineDate(movieId, date) {
  const today = new Date().toISOString().split('T')[0];
  if (date > today) {
    showToast('Cannot set a future date', 'error');
    fetchTimeline();
    return;
  }
  try {
    await api.post('/history', { movieId, watchedAt: new Date(date).toISOString() });
    showToast('Date updated! 📅', 'success');
    fetchTimeline();
  } catch(err) {
    showToast(err.message, 'error');
  }
}

async function deleteFromTimeline(movieId) {
  try {
    await api.delete(`/history/${movieId}`);
    showToast('Removed from timeline', 'info');
    fetchTimeline();
  } catch(err) {
    showToast(err.message, 'error');
  }
}