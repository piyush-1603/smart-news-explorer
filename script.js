const API_KEY = "03527240dd1214a10ccbc03dca00be26";

let allArticles = [];
let searchQuery = "";
let activeCategory = "";
let sortBy = "newest";

//dom
const newsGrid = document.getElementById("newsGrid");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const sortSelect = document.getElementById("sortSelect");
const categoryChips = document.querySelectorAll("#categoryChips .chip");
const articleCount = document.getElementById("article-count");
const loader = document.getElementById("loader");
const emptyState = document.getElementById("emptyState");

//fetch 
async function fetchNews() {
  loader.style.display = "block";

  try {
    const categories = ["technology", "business", "science", "health"];
    let combined = [];

    for (let cat of categories) {
      const res = await fetch(
        `https://gnews.io/api/v4/top-headlines?category=${cat}&lang=en&max=10&apikey=${API_KEY}`
      );

      const data = await res.json();

      // attach category manually
      const articlesWithCategory = (data.articles || []).map(a => ({
        ...a,
        category: cat
      }));

      combined = [...combined, ...articlesWithCategory];
    }

    allArticles = combined;

    loader.style.display = "none";
    render();

  } catch (err) {
    loader.style.display = "none";
    newsGrid.innerHTML = "<p>Failed to load news</p>";
  }
}

//search
function applySearch(articles) {
  if (!searchQuery) return articles;

  const q = searchQuery.toLowerCase();

  return articles.filter(a =>
    a.title?.toLowerCase().includes(q) ||
    a.description?.toLowerCase().includes(q)
  );
}

//category
function applyCategory(articles) {
  if (!activeCategory) return articles;

  return articles.filter(a => a.category === activeCategory);
}

//sort
function applySort(articles) {
  return [...articles].sort((a, b) => {
    if (sortBy === "newest")
      return new Date(b.publishedAt) - new Date(a.publishedAt);

    if (sortBy === "oldest")
      return new Date(a.publishedAt) - new Date(b.publishedAt);

    if (sortBy === "title")
      return (a.title || "").localeCompare(b.title || "");
  });
}

//pipeline
function getVisibleArticles() {
  return applySort(
    applyCategory(
      applySearch(allArticles)
    )
  );
}

// render
function render() {
  const articles = getVisibleArticles();

  articleCount.textContent = `— ${articles.length} articles`;
  newsGrid.innerHTML = "";

  emptyState.style.display = articles.length === 0 ? "block" : "none";

  articles.forEach(article => {
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      ${article.image 
        ? `<img class="card-img" src="${article.image}" />` 
        : `<div class="card-img-placeholder">📰</div>`}

      <div class="card-body">
        <div class="card-meta">
          <span class="card-source">${article.source.name}</span>
          <span class="card-date">${new Date(article.publishedAt).toLocaleDateString()}</span>
        </div>

        <h2 class="card-title">${article.title}</h2>
        <p class="card-desc">${article.description || ""}</p>
      </div>
    `;

    newsGrid.appendChild(card);
  });
}

// EVENTS

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

/* CATEGORY CLICK */
categoryChips.forEach(chip => {
  chip.addEventListener("click", () => {
    categoryChips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");

    activeCategory = chip.dataset.category;
    render();
  });
});

//dark mode
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("theme-icon");

const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
themeIcon.textContent = currentTheme === "dark" ? "☀️" : "🌙";

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", next);
  themeIcon.textContent = next === "dark" ? "☀️" : "🌙";
});


fetchNews();