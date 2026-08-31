// ARCHIVED: full upload/edit version of src/main.js. To restore management
// mode, copy this file to /src/main.js and archive/index.html to /index.html.

import { applyWatermark } from './watermark.js';
import { savePhoto, getAllPhotos, deletePhoto } from './db.js';

const UNSORTED = 'Unsorted';

const gallery = document.getElementById('gallery');
const emptyState = document.getElementById('emptyState');
const photoCount = document.getElementById('photoCount');
const addBtn = document.getElementById('addBtn');
const fileInput = document.getElementById('fileInput');
const dropVeil = document.getElementById('dropVeil');
const toast = document.getElementById('toast');
const catNav = document.getElementById('catNav');
const catList = document.getElementById('catList');

const detail = document.getElementById('detail');
const dImage = document.getElementById('dImage');
const dTitle = document.getElementById('dTitle');
const dDesc = document.getElementById('dDesc');
const dMeta = document.getElementById('dMeta');
const dInfoView = document.getElementById('dInfoView');
const dForm = document.getElementById('dForm');
const dBack = document.getElementById('dBack');
const dPrev = document.getElementById('dPrev');
const dNext = document.getElementById('dNext');
const dEdit = document.getElementById('dEdit');
const dCancel = document.getElementById('dCancel');
const dDownload = document.getElementById('dDownload');
const dDelete = document.getElementById('dDelete');

let photos = []; // newest first
let activeCategory = 'All';
let detailId = null;

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- helpers ---------- */

function normalizePhoto(p) {
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

  catList.innerHTML = cats
    .map((c) => `<option value="${escapeHtml(c)}"></option>`)
    .join('');
}

/* ---------- justified mosaic gallery ---------- */

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

/* ---------- adding photos ---------- */

async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;

  showToast(`Signing ${files.length} photograph${files.length === 1 ? '' : 's'}…`, true);

  let ok = 0;
  let failed = 0;
  for (const file of files) {
    try {
      const { blob, width, height } = await applyWatermark(file);
      const photo = normalizePhoto({
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        type: blob.type,
        blob,
        width,
        height,
        addedAt: Date.now(),
      });
      await savePhoto(photo);
      photo.url = URL.createObjectURL(blob);
      photos.unshift(photo);
      ok++;
    } catch (err) {
      console.error('Failed to process', file.name, err);
      failed++;
    }
  }

  renderNav();
  renderGallery();
  if (failed) {
    showToast(`${ok} added · ${failed} couldn't be read (unsupported format)`);
  } else {
    showToast(`${ok} photograph${ok === 1 ? '' : 's'} signed & added`);
  }
}

addBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  addFiles(fileInput.files);
  fileInput.value = '';
});

/* ---------- drag & drop ---------- */

let dragDepth = 0;

window.addEventListener('dragenter', (e) => {
  if (![...e.dataTransfer.types].includes('Files')) return;
  e.preventDefault();
  dragDepth++;
  dropVeil.classList.add('active');
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropVeil.classList.remove('active');
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  dropVeil.classList.remove('active');
  if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
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

  showForm(false);
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

function showForm(editing) {
  dInfoView.hidden = editing;
  dForm.hidden = !editing;
  if (editing) {
    const p = currentPhoto();
    if (!p) return;
    const f = dForm.elements;
    f.title.value = p.title;
    f.category.value = p.category === UNSORTED ? '' : p.category;
    f.location.value = p.location;
    f.camera.value = p.camera;
    f.lens.value = p.lens;
    f.settings.value = p.settings;
    f.description.value = p.description;
    f.title.focus();
  }
}

dBack.addEventListener('click', closeDetail);
dPrev.addEventListener('click', () => stepDetail(-1));
dNext.addEventListener('click', () => stepDetail(1));
dEdit.addEventListener('click', () => showForm(true));
dCancel.addEventListener('click', () => showForm(false));

dForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const p = currentPhoto();
  if (!p) return;
  const f = dForm.elements;
  p.title = f.title.value.trim() || 'Untitled';
  p.category = f.category.value.trim() || UNSORTED;
  p.location = f.location.value.trim();
  p.camera = f.camera.value.trim();
  p.lens = f.lens.value.trim();
  p.settings = f.settings.value.trim();
  p.description = f.description.value.trim();

  const { url, ...stored } = p;
  await savePhoto(stored);

  renderNav();
  renderGallery();
  openDetail(p.id);
  showToast('Details saved');
});

dDownload.addEventListener('click', () => {
  const p = currentPhoto();
  if (!p) return;
  const a = document.createElement('a');
  a.href = p.url;
  a.download = `${p.title}-maxwell.${p.type === 'image/png' ? 'png' : 'jpg'}`;
  a.click();
});

dDelete.addEventListener('click', async () => {
  const p = currentPhoto();
  if (!p) return;
  const list = visiblePhotos();
  const i = list.findIndex((x) => x.id === p.id);

  await deletePhoto(p.id);
  URL.revokeObjectURL(p.url);
  photos = photos.filter((x) => x.id !== p.id);

  if (activeCategory !== 'All' && !categories().includes(activeCategory)) {
    activeCategory = 'All';
  }
  renderNav();
  renderGallery();
  showToast('Photograph removed');

  const remaining = visiblePhotos();
  if (!remaining.length) closeDetail();
  else openDetail(remaining[Math.min(i, remaining.length - 1)].id);
});

window.addEventListener('keydown', (e) => {
  if (detail.hidden) return;
  const editing = !dForm.hidden;
  if (e.key === 'Escape') {
    editing ? showForm(false) : closeDetail();
  }
  if (editing) return;
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

/* ---------- boot ---------- */

(async function init() {
  try {
    photos = (await getAllPhotos()).map(normalizePhoto);
    photos.forEach((p) => (p.url = URL.createObjectURL(p.blob)));
  } catch (err) {
    console.error('Could not load saved photos', err);
    photos = [];
  }
  renderNav();
  renderGallery();
})();
