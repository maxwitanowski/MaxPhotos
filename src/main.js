// View-only mode: adding, editing, and removing photos is temporarily
// disabled. The full upload/edit version is archived in archive/ —
// copy those files back over index.html and src/main.js to restore it.

import { getAllPhotos } from './db.js';

const UNSORTED = 'Unsorted';

const gallery = document.getElementById('gallery');
const emptyState = document.getElementById('emptyState');
const photoCount = document.getElementById('photoCount');
const toast = document.getElementById('toast');
const catNav = document.getElementById('catNav');

const detail = document.getElementById('detail');
const dImage = document.getElementById('dImage');
const dTitle = document.getElementById('dTitle');
const dDesc = document.getElementById('dDesc');
const dMeta = document.getElementById('dMeta');
const dBack = document.getElementById('dBack');
const dPrev = document.getElementById('dPrev');
const dNext = document.getElementById('dNext');
const dDownload = document.getElementById('dDownload');

let photos = []; // newest first
let activeCategory = 'All';
let detailId = null;

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- helpers ---------- */

function normalizePhoto(p) {
  // Records from the browser database carry an id (it is the store's keyPath),
  // but manifest entries only have a filename. Without this every photo ended up
  // with id === undefined, so find(p => p.id === detailId) always matched the
  // first one and every thumbnail opened the same image.
  p.id = p.id || p.file || p.url;
  p.title = p.title || p.name || 'Untitled';
  p.category = p.category || UNSORTED;
  p.description = p.description || '';
  p.location = p.location || '';
  p.camera = p.camera || '';
  p.lens = p.lens || '';
  p.settings = p.settings || '';
  return p;
}

function categories() {
  return [...new Set(photos.map((p) => p.category))].sort();
}

function visiblePhotos() {
  return activeCategory === 'All'
    ? photos
    : photos.filter((p) => p.category === activeCategory);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/* ---------- category nav ---------- */

function renderNav() {
  const cats = categories();
  catNav.innerHTML = '';
  ['All', ...cats].forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'catnav-link' + (cat === activeCategory ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      renderNav();
      renderGallery();
    });
    catNav.appendChild(btn);
  });
  catNav.hidden = cats.length === 0 || (cats.length === 1 && cats[0] === UNSORTED);
}

/* ---------- justified mosaic gallery ----------
   Rows of photos at their natural aspect ratios, scaled so each
   row fills the container edge-to-edge. */

const GAP = 4;

function buildRows(list, containerWidth, targetHeight) {
  const rows = [];
  let row = [];
  let aspectSum = 0;

  for (const photo of list) {
    const aspect =
      photo.width && photo.height ? photo.width / photo.height : 3 / 2;
    row.push({ photo, aspect });
    aspectSum += aspect;

    const rowWidth = aspectSum * targetHeight + GAP * (row.length - 1);
    if (rowWidth >= containerWidth) {
      const height = (containerWidth - GAP * (row.length - 1)) / aspectSum;
      rows.push({ items: row, height });
      row = [];
      aspectSum = 0;
    }
  }

  if (row.length) {
    // Last row: keep the target height, don't stretch a few photos to fill.
    const height = Math.min(
      targetHeight,
      (containerWidth - GAP * (row.length - 1)) / aspectSum
    );
    rows.push({ items: row, height, last: true });
  }

  return rows;
}

function renderGallery() {
  const visible = visiblePhotos();
  gallery.innerHTML = '';

  const containerWidth = gallery.clientWidth || gallery.parentElement.clientWidth;
  const targetHeight = containerWidth < 640 ? 200 : Math.min(340, containerWidth / 4);
  const rows = buildRows(visible, containerWidth, targetHeight);

  let i = 0;
  for (const { items, height } of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'jrow';
    for (const { photo, aspect } of items) {
      const tile = document.createElement('figure');
      tile.className = 'tile tile-enter';
      tile.dataset.id = photo.id;
      tile.style.width = `${aspect * height}px`;
      tile.style.height = `${height}px`;
      tile.style.animationDelay = `${Math.min(i * 35, 450)}ms`;

      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.title;
      img.loading = 'lazy';

      tile.appendChild(img);
      tile.addEventListener('click', () => openDetail(photo.id));
      rowEl.appendChild(tile);
      i++;
    }
    gallery.appendChild(rowEl);
  }

  const n = photos.length;
  photoCount.textContent =
    n === 0
      ? 'No photographs yet'
      : activeCategory === 'All'
        ? `${n} photograph${n === 1 ? '' : 's'}`
        : `${visible.length} of ${n} photograph${n === 1 ? '' : 's'}`;
  emptyState.hidden = n !== 0;
}

let resizeRaf = null;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(renderGallery);
});

/* ---------- detail view ---------- */

function currentPhoto() {
  return photos.find((p) => p.id === detailId) || null;
}

function openDetail(id) {
  detailId = id;
  const photo = currentPhoto();
  if (!photo) return;

  dImage.src = photo.url;
  dImage.alt = photo.title;
  dTitle.textContent = photo.title;
  dDesc.textContent = photo.description;
  dDesc.hidden = !photo.description;

  const rows = [
    ['Collection', photo.category],
    ['Location', photo.location],
    ['Camera', photo.camera],
    ['Lens', photo.lens],
    ['Settings', photo.settings],
    ['Dimensions', photo.width && photo.height ? `${photo.width} × ${photo.height}` : ''],
  ].filter(([, v]) => v);

  dMeta.innerHTML = rows
    .map(([k, v]) => `<div class="meta-row"><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`)
    .join('');

  detail.hidden = false;
  detail.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  detail.hidden = true;
  detailId = null;
  document.body.style.overflow = '';
}

function stepDetail(delta) {
  const list = visiblePhotos();
  if (!list.length || detailId === null) return;
  let i = list.findIndex((p) => p.id === detailId);
  if (i === -1) i = 0;
  const next = list[(i + delta + list.length) % list.length];
  openDetail(next.id);
}

dBack.addEventListener('click', closeDetail);
dPrev.addEventListener('click', () => stepDetail(-1));
dNext.addEventListener('click', () => stepDetail(1));

dDownload.addEventListener('click', () => {
  const p = currentPhoto();
  if (!p) return;
  const a = document.createElement('a');
  a.href = p.url;
  a.download = `${p.title}-maxwell.${p.type === 'image/png' ? 'png' : 'jpg'}`;
  a.click();
});

window.addEventListener('keydown', (e) => {
  if (detail.hidden) return;
  if (e.key === 'Escape') closeDetail();
  if (e.key === 'ArrowLeft') stepDetail(-1);
  if (e.key === 'ArrowRight') stepDetail(1);
});

/* ---------- toast ---------- */

let toastTimer;
function showToast(message, sticky = false) {
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  if (!sticky) {
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => (toast.hidden = true), 400);
    }, 2600);
  }
}

/* ---------- boot ----------
   Photos load from the static manifest (public/photos/photos.json),
   which is committed to the repo so nothing lives only in one browser.
   Falls back to the browser database if the manifest isn't there yet. */

async function loadPhotos() {
  try {
    const res = await fetch('photos/photos.json', { cache: 'no-store' });
    if (res.ok) {
      const manifest = await res.json();
      if (Array.isArray(manifest.photos) && manifest.photos.length) {
        return manifest.photos
          .map((p) => normalizePhoto({ ...p, url: `photos/${p.file}` }))
          .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      }
    }
  } catch {
    /* no manifest — fall through to the local database */
  }

  const local = (await getAllPhotos()).map(normalizePhoto);
  local.forEach((p) => (p.url = URL.createObjectURL(p.blob)));
  return local;
}

(async function init() {
  try {
    photos = await loadPhotos();
  } catch (err) {
    console.error('Could not load photos', err);
    photos = [];
  }
  renderNav();
  renderGallery();
})();
