const sidebar = document.getElementById('sidebar');
const playerFrame = document.getElementById('playerFrame');
const playerTitle = document.getElementById('playerTitle');
const playerCat = document.getElementById('playerCat');

let videos = [];
let activeId = null;

async function init() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('Gagal memuat data.json');
    const data = await res.json();
    videos = data.videos || [];
    renderList();
    if (videos.length) playVideo(videos[0].id);
  } catch (err) {
    sidebar.innerHTML = `<div class="player-empty" style="padding:24px">Tidak bisa memuat data.json</div>`;
    console.error(err);
  }
}

function renderList() {
  sidebar.innerHTML = '';
  videos.forEach(video => {
    const item = document.createElement('button');
    item.className = 'video-item';
    item.dataset.id = video.id;
    item.innerHTML = `
      <span class="bulb"></span>
      <span class="meta">
        <span class="title">${escapeHtml(video.title)}</span>
        <span class="sub">${escapeHtml(video.category || '')}${video.duration ? ' · ' + escapeHtml(video.duration) : ''}</span>
      </span>
    `;
    item.addEventListener('click', () => playVideo(video.id));
    sidebar.appendChild(item);
  });
}

function playVideo(id) {
  const video = videos.find(v => v.id === id);
  if (!video) return;

  activeId = id;

  playerFrame.innerHTML = `<iframe src="${video.url}" title="${escapeHtml(video.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  playerTitle.textContent = video.title;
  playerCat.textContent = video.category || '';

  document.querySelectorAll('.video-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();
