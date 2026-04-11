const API_KEY = "pub_78da76c334ab431bbd29727277059859";

/* ================= STATE ================= */
let allArticles = [];
let searchQuery = "";
let activeCategory = "";
let sortBy = "newest";

/* ================= DOM ================= */
const newsGrid = document.getElementById("newsGrid");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const sortSelect = document.getElementById("sortSelect");
const categoryChips = document.querySelectorAll("#categoryChips .chip");
const articleCount = document.getElementById("article-count");
const loader = document.getElementById("loader");
const emptyState = document.getElementById("emptyState");

/* ================= FETCH MULTIPLE PAGES ================= */
async function fetchNews() {
  loader.style.display = "block";

  try {
    let url = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&language=en&category=technology,business,science,health`;
    
    let combined = [];

    // 🔥 fetch 3 pages (≈ 30 articles)
    for (let i = 0; i < 2; i++) {
      const res = await fetch(url);
      const data = await res.json();

      combined = [...combined, ...(data.results || [])];

      if (!data.nextPage) break;
      url = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&page=${data.nextPage}`;
    }

    allArticles = combined;
    loader.style.display = "none";
    render();

  } catch (err) {
    loader.style.display = "none";
    newsGrid.innerHTML = "<p>Failed to load news</p>";
  }
}

/* ================= SEARCH ================= */
function applySearch(articles) {
  if (!searchQuery) return articles;

  const q = searchQuery.toLowerCase();

  return articles.filter(a =>
    a.title?.toLowerCase().includes(q) ||
    a.description?.toLowerCase().includes(q)
  );
}

/* ================= FILTER ================= */
function applyCategory(articles) {
  if (!activeCategory) return articles;

  return articles.filter(a =>
    (a.category || []).includes(activeCategory)
  );
}

/* ================= SORT ================= */
function applySort(articles) {
  return [...articles].sort((a, b) => {
    if (sortBy === "newest")
      return new Date(b.pubDate) - new Date(a.pubDate);

    if (sortBy === "oldest")
      return new Date(a.pubDate) - new Date(b.pubDate);

    if (sortBy === "title")
      return (a.title || "").localeCompare(b.title || "");
  });
}

/* ================= PIPELINE ================= */
function getVisibleArticles() {
  return applySort(
    applyCategory(
      applySearch(allArticles)
    )
  );
}

/* ================= RENDER ================= */
function render() {
  const articles = getVisibleArticles();

  articleCount.textContent = `— ${articles.length} articles`;
  newsGrid.innerHTML = "";

  emptyState.style.display = articles.length === 0 ? "block" : "none";

  articles
    .map(article => {
      const card = document.createElement("div");
      card.classList.add("card");

      card.innerHTML = `
        ${article.image_url 
          ? `<img class="card-img" src="${article.image_url}" />` 
          : `<div class="card-img-placeholder">📰</div>`}

        <div class="card-body">
          <div class="card-meta">
            <span class="card-source">${article.source_id || "Unknown"}</span>
            <span class="card-date">${new Date(article.pubDate).toLocaleDateString()}</span>
          </div>

          <h2 class="card-title">${article.title}</h2>
          <p class="card-desc">${article.description || ""}</p>
        </div>
      `;

      return card;
    })
    .forEach(card => newsGrid.appendChild(card));
}

/* ================= EVENTS ================= */

/* SEARCH */
searchInput.addEventListener("input", e => {
  searchQuery = e.target.value.trim();
  render();
});

/* CLEAR */
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchQuery = "";
  render();
});

/* SORT */
sortSelect.addEventListener("change", e => {
  sortBy = e.target.value;
  render();
});

/* FILTER */
categoryChips.forEach(chip => {
  chip.addEventListener("click", () => {
    categoryChips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");

    activeCategory = chip.dataset.category;
    render();
  });
});

/* ================= DARK MODE ================= */
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("theme-icon");

const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
themeIcon.textContent = savedTheme === "dark" ? "☀" : "☾";

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);

  themeIcon.textContent = next === "dark" ? "☀" : "☾";
});

/* ================= INIT ================= */
fetchNews();