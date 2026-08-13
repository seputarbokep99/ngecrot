const PAGE_SIZE = 8; // jumlah video per halaman — ubah sesuai kebutuhan

// kategori yang tampil sebagai baris di beranda — ganti sesuai kategori andalan kamu
const FEATURED_CATEGORIES = ['Kartun', 'Romantis', 'Masak'];

const homeView = document.getElementById('homeView');
const watchView = document.getElementById('watchView');
const backBtn = document.getElementById('backBtn');

const filterBar = document.getElementById('filterBar');
const filterLabel = document.getElementById('filterLabel');
const filterValue = document.getElementById('filterValue');
const filterClear = document.getElementById('filterClear');

const categoryRows = document.getElementById('categoryRows');
const grid = document.getElementById('grid');
const pagination = document.getElementById('pagination');

const playerFrame = document.getElementById('playerFrame');
const playerTitle = document.getElementById('playerTitle');
const studioBlock = document.getElementById('studioBlock');
const playerStudioTags = document.getElementById('playerStudioTags');
const castBlock = document.getElementById('castBlock');
const playerCast = document.getElementById('playerCast');
const categoryBlock = document.getElementById('categoryBlock');
const playerTags = document.getElementById('playerTags');

const homeLink = document.getElementById('homeLink');
const searchInput = document.getElementById('searchInput');

const PLAY_ICON = `
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" stroke="#ece8e0" stroke-width="1.4"/>
    <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#ece8e0"/>
  </svg>
`;

const DIRECT_VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;

/* ---------- cover otomatis dari video (tanpa poster manual di data.json) ----------
   - YouTube  -> ambil thumbnail resmi dari i.ytimg.com
   - File video langsung (mp4/webm/dll) -> tangkap 1 frame lewat <video>+<canvas>
   - Embed lain (mis. vkvideo) -> generate cover placeholder dari judul (tidak bisa
     "mengintip" isi iframe cross-origin, jadi ini batas paling otomatis yang aman) */

const posterCache = new Map(); // video.url -> src poster

function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function placeholderPoster(title) {
  const hue = hashString(title || 'video') % 360;
  const label = escapeHtml((title || '').slice(0, 26));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue},36%,20%)"/>
        <stop offset="100%" stop-color="hsl(${hue},28%,11%)"/>
      </linearGradient>
    </defs>
    <rect width="320" height="180" fill="url(#g)"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="18" fill="rgba(236,232,224,0.55)">${label}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function captureVideoFrame(url) {
  return new Promise((resolve, reject) => {
    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = 'auto';
    vid.src = url;

    const cleanup = () => { vid.removeAttribute('src'); vid.load(); };

    vid.addEventListener('loadeddata', () => {
      try {
        vid.currentTime = Math.min(1, (vid.duration || 2) / 2);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });

    vid.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = vid.videoWidth || 320;
        canvas.height = vid.videoHeight || 180;
        canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });

    vid.addEventListener('error', () => { cleanup(); reject(new Error('video gagal dimuat')); });
  });
}

function getPosterSrc(video) {
  if (posterCache.has(video.url)) return posterCache.get(video.url);

  const ytId = getYouTubeId(video.url);
  if (ytId) {
    const src = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    posterCache.set(video.url, src);
    return src;
  }

  const fallback = placeholderPoster(video.title);
  posterCache.set(video.url, fallback);

  if (DIRECT_VIDEO_EXT.test(video.url)) {
    captureVideoFrame(video.url)
      .then(dataUrl => {
        posterCache.set(video.url, dataUrl);
        document.querySelectorAll(`img[data-video-url="${encodeURIComponent(video.url)}"]`).forEach(img => {
          img.src = dataUrl;
        });
      })
      .catch(() => { /* CORS/gagal load — tetap pakai placeholder */ });
  }

  return fallback;
}

let videos = [];
let activeFilter = null; // { type: 'kategori' | 'pemeran' | 'studio', value: string }
let searchQuery = '';
let currentPage = 1;

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

function getAllCategories() {
  const set = new Set();
  videos.forEach(v => toArray(v.kategori).forEach(cat => set.add(cat)));
  return Array.from(set);
}

function getFeaturedCategoriesPresent() {
  const all = getAllCategories();
  return FEATURED_CATEGORIES.filter(cat => all.includes(cat));
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

/* ---------- render utama: baris kategori (jelajah) vs grid (hasil filter/cari) ---------- */

function render() {
  renderFilterBar();

  const browseMode = !activeFilter && !searchQuery && getFeaturedCategoriesPresent().length > 0;

  if (browseMode) {
    categoryRows.hidden = false;
    grid.hidden = true;
    pagination.hidden = true;
    renderCategoryRows();
    return;
  }

  categoryRows.hidden = true;
  grid.hidden = false;
  pagination.hidden = false;

  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  renderGrid(pageItems, filtered.length);
  renderPagination(totalPages);
}

/* ---------- baris kategori (beranda) ---------- */

function renderCategoryRows() {
  categoryRows.innerHTML = '';

  getFeaturedCategoriesPresent().forEach(cat => {
    const items = videos.filter(v => toArray(v.kategori).includes(cat));
    if (items.length === 0) return;

    const row = document.createElement('section');
    row.className = 'category-row';
    row.innerHTML = `
      <div class="row-header">
        <span class="chip row-label">${escapeHtml(cat)}</span>
        <button type="button" class="chip row-more">Video Lainnya</button>
      </div>
      <div class="row-scroll"></div>
    `;

    const scroll = row.querySelector('.row-scroll');
    items.slice(0, 14).forEach(video => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'row-card';
      item.innerHTML = `
        <span class="row-poster">
          <img src="${getPosterSrc(video)}" data-video-url="${encodeURIComponent(video.url)}" alt="" loading="lazy">
          <span class="play-mark">${PLAY_ICON}</span>
        </span>
        <span class="row-title">${escapeHtml(video.title)}</span>
      `;
      item.addEventListener('click', () => openWatch(video));
      scroll.appendChild(item);
    });

    row.querySelector('.row-more').addEventListener('click', () => setFilter('kategori', cat));
    categoryRows.appendChild(row);
  });
}

/* ---------- filter bar ---------- */

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

/* ---------- grid hasil filter/cari ---------- */

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
        <img src="${getPosterSrc(video)}" data-video-url="${encodeURIComponent(video.url)}" alt="" loading="lazy">
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

/* ---------- filter (dipicu dari tombol "Video Lainnya", tag kategori/pemeran/studio) ---------- */

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

/* ---------- halaman tonton ---------- */

function openWatch(video) {
  if (DIRECT_VIDEO_EXT.test(video.url)) {
    playerFrame.innerHTML = `<video src="${video.url}" controls autoplay playsinline></video>`;
  } else {
    playerFrame.innerHTML = `<iframe src="${video.url}" title="${escapeHtml(video.title)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock" frameborder="0" allowfullscreen></iframe>`;
  }

  playerTitle.textContent = video.title;

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

  showWatch();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();
