const PAGE_SIZE = 8; // jumlah video per halaman — ubah sesuai kebutuhan

// kategori yang ditampilkan duluan di beranda — ganti sesuai kategori andalan kamu
const FEATURED_CATEGORIES = ['OnlyFans', 'Big Tits', 'Creampie'];

const homeView = document.getElementById('homeView');
const watchView = document.getElementById('watchView');
const backBtn = document.getElementById('backBtn');

const grid = document.getElementById('grid');
const pagination = document.getElementById('pagination');
const categoryNav = document.getElementById('categoryNav');
const filterBar = document.getElementById('filterBar');
const filterLabel = document.getElementById('filterLabel');
const filterValue = document.getElementById('filterValue');
const filterClear = document.getElementById('filterClear');

const playerFrame = document.getElementById('playerFrame');
const playerTitle = document.getElementById('playerTitle');
const playerDesc = document.getElementById('playerDesc');
const studioBlock = document.getElementById('studioBlock');
const playerStudioTags = document.getElementById('playerStudioTags');
const castBlock = document.getElementById('castBlock');
const playerCast = document.getElementById('playerCast');
const categoryBlock = document.getElementById('categoryBlock');
const playerTags = document.getElementById('playerTags');
const playerRecs = document.getElementById('playerRecs');
const recsRow = document.getElementById('recsRow');

const homeLink = document.getElementById('homeLink');
const searchInput = document.getElementById('searchInput');

const PLAY_ICON = `
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" stroke="#ece8e0" stroke-width="1.4"/>
    <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#ece8e0"/>
  </svg>
`;

const DIRECT_VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;

let videos = [];
let activeFilter = null; // { type: 'kategori' | 'pemeran' | 'studio', value: string }
let searchQuery = '';
let currentPage = 1;
let categoryNavExpanded = false;

async function init() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('Gagal memuat data.json');
    const data = await res.json();
    videos = data.videos || [];
    render();
  } catch (err) {
    grid.innerHTML = `<p class="grid-empty">Tidak bisa memuat data.json</p>`;
    console.error(err);
  }
}

function toArray(k) {
  if (Array.isArray(k)) return k.filter(Boolean);
  if (k) return [k];
  return [];
}

function getFiltered() {
  let list = videos;

  if (activeFilter) {
    list = list.filter(v => toArray(v[activeFilter.type]).includes(activeFilter.value));
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(v => {
      const title = (v.title || '').toLowerCase();
      const cats = toArray(v.kategori).join(' ').toLowerCase();
      const cast = toArray(v.pemeran).join(' ').toLowerCase();
      return title.includes(q) || cats.includes(q) || cast.includes(q);
    });
  }

  return list;
}

function render() {
  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  renderCategoryNav();
  renderFilterBar();
  renderGrid(pageItems, filtered.length);
  renderPagination(totalPages);
}

function getAllCategories() {
  const set = new Set();
  videos.forEach(v => toArray(v.kategori).forEach(cat => set.add(cat)));
  return Array.from(set);
}

function renderCategoryNav() {
  const allCategories = getAllCategories();
  if (allCategories.length === 0) {
    categoryNav.hidden = true;
    return;
  }
  categoryNav.hidden = false;

  const featured = FEATURED_CATEGORIES.filter(cat => allCategories.includes(cat));
  const rest = allCategories.filter(cat => !featured.includes(cat));
  const shown = categoryNavExpanded ? [...featured, ...rest] : featured;

  const chipHtml = cat =>
    `<button type="button" class="chip${activeFilter && activeFilter.type === 'kategori' && activeFilter.value === cat ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;

  let html = shown.map(chipHtml).join('');
  if (rest.length > 0) {
    html += `<button type="button" class="chip chip-more" id="moreCategoriesBtn">${categoryNavExpanded ? 'Lebih Sedikit' : 'Kategori Lainnya'}</button>`;
  }
  categoryNav.innerHTML = html;

  categoryNav.querySelectorAll('.chip:not(.chip-more)').forEach(btn => {
    btn.addEventListener('click', () => setFilter('kategori', btn.dataset.cat));
  });

  const moreBtn = document.getElementById('moreCategoriesBtn');
  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      categoryNavExpanded = !categoryNavExpanded;
      renderCategoryNav();
    });
  }
}

function renderFilterBar() {
  if (activeFilter) {
    filterBar.hidden = false;
    filterLabel.textContent = activeFilter.type === 'pemeran' ? 'Pemeran:' : activeFilter.type === 'studio' ? 'Studio:' : 'Kategori:';
    filterValue.textContent = activeFilter.value;
    filterValue.style.color = activeFilter.type === 'kategori' ? 'var(--accent)' : 'var(--accent-cast)';
  } else {
    filterBar.hidden = true;
  }
}

function renderGrid(items, totalCount) {
  grid.innerHTML = '';

  if (totalCount === 0) {
    const msg = searchQuery ? `Tidak ada hasil untuk "${escapeHtml(searchQuery)}".` : 'Tidak ada video untuk kategori ini.';
    grid.innerHTML = `<p class="grid-empty">${msg}</p>`;
    return;
  }

  items.forEach(video => {
    const categories = toArray(video.kategori);

    const card = document.createElement('div');
    card.className = 'card';

    const poster = document.createElement('div');
    poster.className = 'card-poster';
    poster.innerHTML = `
      <button class="poster-open" aria-label="Putar ${escapeHtml(video.title)}">
        <img src="${video.poster}" alt="" loading="lazy">
        <span class="play-mark">${PLAY_ICON}</span>
      </button>
    `;
    poster.querySelector('.poster-open').addEventListener('click', () => openWatch(video));

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.innerHTML = `
      <button type="button" class="card-title-btn">
        <span class="card-title">${escapeHtml(video.title)}</span>
      </button>
      <span class="card-tags">
        ${categories.map(cat => `<button type="button" class="tag${activeFilter && activeFilter.type === 'kategori' && activeFilter.value === cat ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('')}
      </span>
    `;
    meta.querySelector('.card-title-btn').addEventListener('click', () => openWatch(video));
    meta.querySelectorAll('.tag').forEach(btn => {
      btn.addEventListener('click', () => setFilter('kategori', btn.dataset.cat));
    });

    card.appendChild(poster);
    card.appendChild(meta);
    grid.appendChild(card);
  });
}

function renderPagination(totalPages) {
  pagination.innerHTML = '';
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '← Sebelumnya';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => goToPage(currentPage - 1));

  const status = document.createElement('span');
  status.className = 'page-status';
  status.innerHTML = `Halaman <span class="current">${currentPage}</span> / ${totalPages}`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = 'Berikutnya →';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => goToPage(currentPage + 1));

  pagination.appendChild(prevBtn);
  pagination.appendChild(status);
  pagination.appendChild(nextBtn);
}

function goToPage(page) {
  currentPage = page;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFilter(type, value) {
  activeFilter = (activeFilter && activeFilter.type === type && activeFilter.value === value)
    ? null
    : { type, value };
  currentPage = 1;
  showHome();
  render();
}

filterClear.addEventListener('click', () => {
  activeFilter = null;
  currentPage = 1;
  render();
});

searchInput.addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  currentPage = 1;
  render();
});

/* ---------- home <-> watch view ---------- */

function showHome() {
  playerFrame.innerHTML = ''; // stop pemutaran saat keluar dari halaman tonton
  watchView.hidden = true;
  homeView.hidden = false;
}

function showWatch() {
  homeView.hidden = true;
  watchView.hidden = false;
  window.scrollTo(0, 0);
}

backBtn.addEventListener('click', showHome);

homeLink.addEventListener('click', () => {
  activeFilter = null;
  searchQuery = '';
  searchInput.value = '';
  currentPage = 1;
  showHome();
  render();
});

homeLink.addEventListener('click', () => {
  activeFilter = null;
  searchQuery = '';
  searchInput.value = '';
  currentPage = 1;
  showHome();
  render();
});

/* ---------- halaman tonton ---------- */

function openWatch(video) {
  if (DIRECT_VIDEO_EXT.test(video.url)) {
    playerFrame.innerHTML = `<video src="${video.url}" controls autoplay playsinline></video>`;
  } else {
    playerFrame.innerHTML = `<iframe src="${video.url}" title="${escapeHtml(video.title)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock" frameborder="0" allowfullscreen></iframe>`;
  }

  playerTitle.textContent = video.title;
  playerDesc.textContent = video.deskripsi || '';

  studioBlock.hidden = !video.studio;
  if (video.studio) {
    playerStudioTags.innerHTML = `<button type="button" class="tag info-tag${activeFilter && activeFilter.type === 'studio' && activeFilter.value === video.studio ? ' active' : ''}">${escapeHtml(video.studio)}</button>`;
    playerStudioTags.querySelector('.tag').addEventListener('click', () => setFilter('studio', video.studio));
  }

  const cast = toArray(video.pemeran);
  castBlock.hidden = cast.length === 0;
  playerCast.innerHTML = cast.map(name =>
    `<button type="button" class="tag info-tag${activeFilter && activeFilter.type === 'pemeran' && activeFilter.value === name ? ' active' : ''}" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`
  ).join('');
  playerCast.querySelectorAll('.tag').forEach(btn => {
    btn.addEventListener('click', () => setFilter('pemeran', btn.dataset.name));
  });

  const categories = toArray(video.kategori);
  categoryBlock.hidden = categories.length === 0;
  playerTags.innerHTML = categories.map(cat =>
    `<button type="button" class="tag info-tag${activeFilter && activeFilter.type === 'kategori' && activeFilter.value === cat ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
  ).join('');
  playerTags.querySelectorAll('.tag').forEach(btn => {
    btn.addEventListener('click', () => setFilter('kategori', btn.dataset.cat));
  });

  renderRecommendations(video);
  showWatch();
}

function renderRecommendations(current) {
  const currentCats = toArray(current.kategori);

  // dahulukan video dengan kategori yang sama, sisanya isi dari video lain
  const sameCategory = videos.filter(v => v !== current && toArray(v.kategori).some(c => currentCats.includes(c)));
  const others = videos.filter(v => v !== current && !sameCategory.includes(v));
  const recs = [...sameCategory, ...others].slice(0, 8);

  if (recs.length === 0) {
    playerRecs.hidden = true;
    return;
  }
  playerRecs.hidden = false;

  recsRow.innerHTML = '';
  recs.forEach(video => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'rec-card';
    item.innerHTML = `
      <span class="rec-poster">
        <img src="${video.poster}" alt="" loading="lazy">
      </span>
      <span class="rec-title">${escapeHtml(video.title)}</span>
    `;
    item.addEventListener('click', () => openWatch(video));
    recsRow.appendChild(item);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();
