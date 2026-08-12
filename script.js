const grid = document.getElementById('grid');
const overlay = document.getElementById('overlay');
const playerFrame = document.getElementById('playerFrame');
const playerTitle = document.getElementById('playerTitle');
const playerDesc = document.getElementById('playerDesc');
const playerCat = document.getElementById('playerCat');
const closeBtn = document.getElementById('closeBtn');

const PLAY_ICON = `
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" stroke="#ece8e0" stroke-width="1.4"/>
    <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#ece8e0"/>
  </svg>
`;

let videos = [];

async function init() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('Gagal memuat data.json');
    const data = await res.json();
    videos = data.videos || [];
    renderGrid();
  } catch (err) {
    grid.innerHTML = `<p style="font-family:'IBM Plex Mono',monospace;color:#8b9199;font-size:13px">Tidak bisa memuat data.json</p>`;
    console.error(err);
  }
}

function renderGrid() {
  grid.innerHTML = '';
  videos.forEach((video, index) => {
    const card = document.createElement('button');
    card.className = 'card';
    card.setAttribute('aria-label', `Putar ${video.title}`);
    card.innerHTML = `
      <span class="card-poster">
        <img src="${video.poster}" alt="" loading="lazy">
        <span class="play-mark">${PLAY_ICON}</span>
      </span>
      <span class="card-meta">
        <span class="card-title">${escapeHtml(video.title)}</span>
        <span class="card-sub">${escapeHtml(video.kategori || '')}</span>
      </span>
    `;
    card.addEventListener('click', () => openPlayer(index));
    grid.appendChild(card);
  });
}

const DIRECT_VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;

function openPlayer(index) {
  const video = videos[index];
  if (!video) return;

  if (DIRECT_VIDEO_EXT.test(video.url)) {
    // link file video langsung -> pakai tag <video>
    playerFrame.innerHTML = `<video src="${video.url}" controls autoplay playsinline></video>`;
  } else {
    // link halaman embed (YouTube, Vimeo, dll) -> pakai <iframe>
    playerFrame.innerHTML = `<iframe src="${video.url}" title="${escapeHtml(video.title)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock" frameborder="0" allowfullscreen></iframe>`;
  }

  playerTitle.textContent = video.title;
  playerDesc.textContent = video.deskripsi || '';
  playerCat.textContent = video.kategori || '';

  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  closeBtn.focus();
}

function closePlayer() {
  overlay.hidden = true;
  playerFrame.innerHTML = ''; // stop pemutaran saat ditutup
  document.body.style.overflow = '';
}

closeBtn.addEventListener('click', closePlayer);
overlay.addEventListener('click', e => {
  if (e.target === overlay) closePlayer();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !overlay.hidden) closePlayer();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();
