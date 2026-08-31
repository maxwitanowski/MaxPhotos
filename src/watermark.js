// Stamps a semi-transparent cursive "maxwell" signature onto an image
// and returns the watermarked file as a Blob.

const SIGNATURE = 'maxwell';
const FONT_FAMILY = '"Pinyon Script"';

let fontReady = null;

function ensureFont() {
  if (!fontReady) {
    // Load at a large size so the canvas can use any scale of it.
    fontReady = document.fonts.load(`400 120px ${FONT_FAMILY}`).catch(() => {});
  }
  return fontReady;
}

export async function applyWatermark(file) {
  await ensureFont();

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  // Signature scales with the image; never illegibly small.
  const fontSize = Math.max(26, Math.round(Math.min(width, height) * 0.06));
  const pad = Math.round(fontSize * 0.7);

  ctx.font = `400 ${fontSize}px ${FONT_FAMILY}, cursive`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';

  // Soft shadow keeps the signature readable on bright skies and snow
  // without making the translucent ink feel heavy.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = Math.max(2, fontSize * 0.08);
  ctx.shadowOffsetY = Math.max(1, fontSize * 0.02);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.fillText(SIGNATURE, width - pad, height - pad);

  const isPng = file.type === 'image/png';
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not encode image'))),
      isPng ? 'image/png' : 'image/jpeg',
      0.92
    );
  });

  return { blob, width, height };
}
