

const API_KEY = 'bbd970058f554533be8423ab7236550b';
const API_URL = `https://newsapi.org/v2/everything?q=apple&from=2026-03-08&sortBy=popularity&pageSize=100&apiKey=${API_KEY}`;
const PER_PAGE = 9;

/* ── State ── */
let allArticles   = [];
let currentPage   = 0;
let showSavedOnly = false;
let isListView    = false;

let searchQuery   = '';
let activeCategory = '';
let sortBy        = 'newest';

let likedIds  = JSON.parse(localStorage.getItem('nb_liked')  || '[]');
let savedIds  = JSON.parse(localStorage.getItem('nb_saved')  || '[]');

/* ── DOM refs ── */
const newsGrid      = document.getElementById('newsGrid');
const pagination    = document.getElementById('pagination');
const loader        = document.getElementById('loader');
const errorState    = document.getElementById('errorState');
const emptyState    = document.getElementById('emptyState');
const searchInput   = document.getElementById('searchInput');
const searchClear   = document.getElementById('searchClear');
const sortSelect    = document.getElementById('sortSelect');
const themeToggle   = document.getElementById('themeToggle');
const themeIcon     = document.getElementById('theme-icon');
const articleCount  = document.getElementById('article-count');
const savedBadge    = document.getElementById('saved-badge');
const savedNum      = document.getElementById('saved-num');
const savedFilterBtn= document.getElementById('savedFilterBtn');
const clearSavedBtn = document.getElementById('clearSavedBtn');
const gridViewBtn   = document.getElementById('gridView');
const listViewBtn   = document.getElementById('listView');
const retryBtn      = document.getElementById('retryBtn');
const toast         = document.getElementById('toast');
const categoryChips = document.querySelectorAll('#categoryChips .chip');

/* ──────────────────────────────────────────
   FETCH
─────────────────────────────────────────── */
function fetchNews() {
  loader.style.display = 'block';
  errorState.style.display = 'none';
  newsGrid.innerHTML = '';
  pagination.innerHTML = '';

  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      loader.style.display = 'none';

      if (data.status !== 'ok' || !data.articles) {
        showError();
        return;
      }

      // filter out articles with [Removed] title using HOF
      allArticles = data.articles.filter(a => a.title && a.title !== '[Removed]');
      render();
    })
    .catch(() => {
      loader.style.display = 'none';
      showError();
    });
}

function showError() {
  errorState.style.display = 'block';
}

/* ──────────────────────────────────────────
   PIPELINE — filter → sort → paginate (all HOFs)
─────────────────────────────────────────── */

/* 1. Search filter */
function applySearch(articles) {
  if (!searchQuery) return articles;
  const q = searchQuery.toLowerCase();
  return articles.filter(a =>
    (a.title       && a.title.toLowerCase().includes(q)) ||
    (a.description && a.description.toLowerCase().includes(q)) ||
    (a.source?.name && a.source.name.toLowerCase().includes(q))
  );
}

/* 2. Category filter — using source name as proxy */
function applyCategory(articles) {
  if (!activeCategory) return articles;
  const catMap = {
    technology: ['techcrunch','the verge','wired','ars technica','engadget','venturebeat','zdnet','cnet'],
    business:   ['bloomberg','reuters','cnbc','wall street journal','forbes','business insider','financial times'],
    science:    ['scientific american','nature','new scientist','national geographic','science daily','space.com'],
    health:     ['healthline','webmd','mayo clinic','stat news','medscape','health','medical news today'],
  };
  const sources = catMap[activeCategory] || [];
  return articles.filter(a => {
    const src = (a.source?.name || '').toLowerCase();
    return sources.some(s => src.includes(s));
  });
}

/* 3. Saved only filter */
function applySavedFilter(articles) {
  if (!showSavedOnly) return articles;
  return articles.filter(a => savedIds.includes(a.url));
}

/* 4. Sort */
function applySort(articles) {
  return [...articles].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.publishedAt) - new Date(a.publishedAt);
    if (sortBy === 'oldest') return new Date(a.publishedAt) - new Date(b.publishedAt);
    if (sortBy === 'title')  return (a.title || '').localeCompare(b.title || '');
    return 0;
  });
}

/* 5. Paginate */
function applyPagination(articles) {
  return articles.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);
}

/* Compose pipeline */
function getVisibleArticles() {
  return applyPagination(
    applySort(
      applyCategory(
        applySearch(
          applySavedFilter(allArticles)
        )
      )
    )
  );
}

function getTotalFiltered() {
  return applySort(
    applyCategory(
      applySearch(
        applySavedFilter(allArticles)
      )
    )
  ).length;
}

/* ──────────────────────────────────────────
   RENDER
─────────────────────────────────────────── */
function render() {
  const visible = getVisibleArticles();
  const total   = getTotalFiltered();

  articleCount.textContent = `— ${total} article${total !== 1 ? 's' : ''}`;
  savedNum.textContent     = savedIds.length;

  newsGrid.innerHTML = '';
  emptyState.style.display = visible.length === 0 ? 'block' : 'none';

  // Build cards using .map() then forEach
  visible
    .map(article => buildCard(article))
    .forEach((card, i) => {
      card.style.animationDelay = `${i * 0.04}s`;
      newsGrid.appendChild(card);
    });

  renderPagination(total);
}

/* ──────────────────────────────────────────
   BUILD CARD
─────────────────────────────────────────── */
function buildCard(article) {
  const isLiked = likedIds.includes(article.url);
  const isSaved = savedIds.includes(article.url);

  const card = document.createElement('div');
  card.classList.add('card');

  // Image
  if (article.urlToImage) {
    const img = document.createElement('img');
    img.classList.add('card-img');
    img.src = article.urlToImage;
    img.alt = article.title || 'News image';
    img.loading = 'lazy';
    img.onerror = () => img.replaceWith(makePlaceholder());
    card.appendChild(img);
  } else {
    card.appendChild(makePlaceholder());
  }

  // Body
  const body = document.createElement('div');
  body.classList.add('card-body');

  // Meta row
  const meta = document.createElement('div');
  meta.classList.add('card-meta');

  const source = document.createElement('span');
  source.classList.add('card-source');
  source.textContent = article.source?.name || 'Unknown';

  const date = document.createElement('span');
  date.classList.add('card-date');
  date.textContent = formatDate(article.publishedAt);

  meta.appendChild(source);
  meta.appendChild(date);

  // Title
  const title = document.createElement('h2');
  title.classList.add('card-title');
  title.textContent = article.title || 'No title';

  // Description
  const desc = document.createElement('p');
  desc.classList.add('card-desc');
  desc.textContent = article.description || '';

  body.appendChild(meta);
  body.appendChild(title);
  body.appendChild(desc);

  // Inline actions for list view
  const inlineActions = document.createElement('div');
  inlineActions.classList.add('card-actions-inline');
  inlineActions.style.display = 'none';
  inlineActions.appendChild(makeLikeBtn(article, isLiked));
  inlineActions.appendChild(makeSaveBtn(article, isSaved));
  if (article.url) {
    inlineActions.appendChild(makeReadLink(article.url));
  }
  body.appendChild(inlineActions);

  card.appendChild(body);

  // Footer


  return card;
}

function makePlaceholder() {
  const ph = document.createElement('div');
  ph.classList.add('card-img-placeholder');
  ph.textContent = '📰';
  return ph;
}

function makeLikeBtn(article, isLiked) {
  const btn = document.createElement('button');
  btn.classList.add('card-btn', 'btn-like');
  if (isLiked) btn.classList.add('liked');
  btn.innerHTML = `${isLiked ? '♥' : '♡'} Like`;
  btn.addEventListener('click', () => toggleLike(article.url, btn));
  return btn;
}

function makeSaveBtn(article, isSaved) {
  const btn = document.createElement('button');
  btn.classList.add('card-btn', 'btn-save');
  if (isSaved) btn.classList.add('saved');
  btn.innerHTML = `${isSaved ? '★' : '☆'} ${isSaved ? 'Saved' : 'Save'}`;
  btn.addEventListener('click', () => toggleSave(article.url, btn));
  return btn;
}

function makeReadLink(url) {
  const a = document.createElement('a');
  a.classList.add('card-read');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = 'Read →';
  return a;
}


/* ──────────────────────────────────────────
   PAGINATION (built with .map())
─────────────────────────────────────────── */
function renderPagination(total) {
  pagination.innerHTML = '';
  const totalPages = Math.ceil(total / PER_PAGE);
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.classList.add('page-btn');
  prevBtn.textContent = '‹';
  prevBtn.disabled = currentPage === 0;
  prevBtn.addEventListener('click', () => { currentPage--; render(); scrollToTop(); });
  pagination.appendChild(prevBtn);

  // Use Array.from + .map() to create page buttons
  Array.from({ length: totalPages }, (_, i) => i)
    .map(i => {
      const btn = document.createElement('button');
      btn.classList.add('page-btn');
      if (i === currentPage) btn.classList.add('active');
      btn.textContent = i + 1;
      btn.addEventListener('click', () => { currentPage = i; render(); scrollToTop(); });
      return btn;
    })
    .forEach(btn => pagination.appendChild(btn));

  const nextBtn = document.createElement('button');
  nextBtn.classList.add('page-btn');
  nextBtn.textContent = '›';
  nextBtn.disabled = currentPage >= totalPages - 1;
  nextBtn.addEventListener('click', () => { currentPage++; render(); scrollToTop(); });
  pagination.appendChild(nextBtn);
}

function scrollToTop() {
  window.scrollTo({ top: 200, behavior: 'smooth' });
}

/* ──────────────────────────────────────────
   DEBOUNCED SEARCH
─────────────────────────────────────────── */
let debounceTimer;
searchInput.addEventListener('input', e => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    currentPage = 0;
    render();
  }, 400);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  currentPage = 0;
  render();
});

/* ──────────────────────────────────────────
   CATEGORY CHIPS
─────────────────────────────────────────── */
categoryChips.forEach(chip => {
  chip.addEventListener('click', () => {
    categoryChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.category;
    currentPage = 0;
    render();
  });
});

/* ──────────────────────────────────────────
   SORT
─────────────────────────────────────────── */
sortSelect.addEventListener('change', e => {
  sortBy = e.target.value;
  currentPage = 0;
  render();
});

/* ──────────────────────────────────────────
   DARK / LIGHT THEME
─────────────────────────────────────────── */
const savedTheme = localStorage.getItem('nb_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeIcon.textContent = savedTheme === 'dark' ? '☀' : '☾';

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('nb_theme', next);
  themeIcon.textContent = next === 'dark' ? '☀' : '☾';
});

/* ──────────────────────────────────────────
   VIEW TOGGLE (grid / list)
─────────────────────────────────────────── */
gridViewBtn.addEventListener('click', () => {
  isListView = false;
  newsGrid.classList.remove('list-view');
  gridViewBtn.classList.add('active');
  listViewBtn.classList.remove('active');
});

listViewBtn.addEventListener('click', () => {
  isListView = true;
  newsGrid.classList.add('list-view');
  listViewBtn.classList.add('active');
  gridViewBtn.classList.remove('active');
});

/* ──────────────────────────────────────────
   RETRY
─────────────────────────────────────────── */
retryBtn.addEventListener('click', fetchNews);

/* ──────────────────────────────────────────
   TOAST
─────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ──────────────────────────────────────────
   HELPERS
─────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1)  return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)  return `${diffD}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ──────────────────────────────────────────
   INIT
─────────────────────────────────────────── */
fetchNews();