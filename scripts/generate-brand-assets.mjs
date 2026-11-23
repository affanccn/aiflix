import sharp from 'sharp';
import fs from 'fs';

const src = 'C:/Users/Asus/.gemini/antigravity/brain/535e274e-9c91-461d-8dc7-19b6ba704049/.user_uploaded/media_1795419242712_da894e19.png';

async function processLogo() {
  console.log('Processing uploaded brand logo:', src);
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);

  // Exact logo bounds with breathing room for the outer glow
  const boxLeft = 135;
  const boxRight = 900;
  const boxTop = 136;
  const boxBottom = 408;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      if (x < boxLeft || x > boxRight || y < boxTop || y > boxBottom) {
        out[idx] = 0;
        out[idx + 1] = 0;
        out[idx + 2] = 0;
        out[idx + 3] = 0;
        continue;
      }

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const maxVal = Math.max(r, g, b);
      const isWhite = r > 115 && g > 115 && b > 115 && Math.abs(r - g) < 40 && Math.abs(g - b) < 40;
      const isOrange = r > 45 && r > (b * 1.25) + 8;
      const isYellowGlow = r > 65 && g > 45 && b < 65;

      if (isWhite) {
        // Crisp white text and play icon center
        const alpha = Math.min(255, Math.round(((maxVal - 40) / 95) * 255));
        out[idx] = r;
        out[idx + 1] = g;
        out[idx + 2] = b;
        out[idx + 3] = alpha > 235 ? 255 : alpha;
      } else if (isOrange || isYellowGlow) {
        // Orange element or orange glow
        const orangeIntensity = r - b;
        let alpha = 255;
        if (orangeIntensity < 70) {
          alpha = Math.round(Math.min(255, (orangeIntensity / 70) * 255));
        }
        out[idx] = r;
        out[idx + 1] = g;
        out[idx + 2] = b;
        out[idx + 3] = alpha;
      } else {
        // Dark background texture
        out[idx] = 0;
        out[idx + 1] = 0;
        out[idx + 2] = 0;
        out[idx + 3] = 0;
      }
    }
  }

  // Ensure directories exist
  if (!fs.existsSync('public/img')) fs.mkdirSync('public/img', { recursive: true });
  if (!fs.existsSync('public/icons')) fs.mkdirSync('public/icons', { recursive: true });

  // 1. Full logo (transparent) for site Navbar & Footer
  const fullW = boxRight - boxLeft;
  const fullH = boxBottom - boxTop;
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: boxLeft, top: boxTop, width: fullW, height: fullH })
    .png()
    .toFile('public/img/logo-full.png');
  console.log('Generated: public/img/logo-full.png');

  // 2. Icon Mark (transparent square) for Navbar & UI badges
  const markW = 390 - boxLeft;
  const markH = boxBottom - boxTop;
  const squareSize = Math.max(markW, markH) + 16;
  const padX = Math.round((squareSize - markW) / 2);
  const padY = Math.round((squareSize - markH) / 2);

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: boxLeft, top: boxTop, width: markW, height: markH })
    .extend({
      top: padY,
      bottom: squareSize - markH - padY,
      left: padX,
      right: squareSize - markW - padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile('public/img/logo-mark.png');
  console.log('Generated: public/img/logo-mark.png');

  // ---------------------------------------------------------------------------
  // 3. Mobile / PWA App Icons: SOLID DARK BACKGROUND & PERFECT SAFE-ZONE
  // (Prevents Android / iOS from forcing an ugly white square around the icon!)
  // ---------------------------------------------------------------------------
  function createDarkCanvasSvg(width, height) {
    return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#141c2e" />
          <stop offset="55%" stop-color="#080c16" />
          <stop offset="100%" stop-color="#04060b" />
        </radialGradient>
        <radialGradient id="ambientGlow" cx="50%" cy="52%" r="48%">
          <stop offset="0%" stop-color="#ff6b08" stop-opacity="0.28" />
          <stop offset="50%" stop-color="#ff6b08" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#ff6b08" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      <circle cx="${width / 2}" cy="${height / 2}" r="${width * 0.42}" fill="url(#ambientGlow)" />
    </svg>`);
  }

  // 512x512 solid dark app icon (with 360px centered icon mark)
  const icon360 = await sharp('public/img/logo-mark.png')
    .resize(360, 360, { fit: 'contain' })
    .toBuffer();

  const canvas512 = createDarkCanvasSvg(512, 512);
  await sharp(canvas512)
    .composite([{ input: icon360, top: 76, left: 76 }])
    .png()
    .toFile('public/icons/icon-512.png');
  console.log('Generated: public/icons/icon-512.png (solid dark)');

  // 192x192 solid dark app icon
  const icon136 = await sharp('public/img/logo-mark.png')
    .resize(136, 136, { fit: 'contain' })
    .toBuffer();

  const canvas192 = createDarkCanvasSvg(192, 192);
  await sharp(canvas192)
    .composite([{ input: icon136, top: 28, left: 28 }])
    .png()
    .toFile('public/icons/icon-192.png');
  console.log('Generated: public/icons/icon-192.png (solid dark)');

  // Maskable 512x512 icon (safe zone: 65% size = 330px centered)
  const icon330 = await sharp('public/img/logo-mark.png')
    .resize(330, 330, { fit: 'contain' })
    .toBuffer();

  await sharp(canvas512)
    .composite([{ input: icon330, top: 91, left: 91 }])
    .png()
    .toFile('public/icons/icon-maskable-512.png');
  console.log('Generated: public/icons/icon-maskable-512.png (Android adaptive maskable)');

  // Maskable 192x192 icon
  const icon124 = await sharp('public/img/logo-mark.png')
    .resize(124, 124, { fit: 'contain' })
    .toBuffer();

  await sharp(canvas192)
    .composite([{ input: icon124, top: 34, left: 34 }])
    .png()
    .toFile('public/icons/icon-maskable-192.png');
  console.log('Generated: public/icons/icon-maskable-192.png (Android adaptive maskable)');

  // Apple touch icon (180x180 solid dark)
  const icon128 = await sharp('public/img/logo-mark.png')
    .resize(128, 128, { fit: 'contain' })
    .toBuffer();

  const canvas180 = createDarkCanvasSvg(180, 180);
  await sharp(canvas180)
    .composite([{ input: icon128, top: 26, left: 26 }])
    .png()
    .toFile('public/icons/apple-touch-icon.png');
  console.log('Generated: public/icons/apple-touch-icon.png (iOS home screen)');

  // Favicon 32x32
  await sharp('public/icons/icon-192.png')
    .resize(32, 32, { fit: 'contain' })
    .png()
    .toFile('public/icons/favicon-32.png');
  console.log('Generated: public/icons/favicon-32.png');

  // Favicon.ico
  await sharp('public/icons/favicon-32.png')
    .toFile('public/favicon.ico');
  console.log('Generated: public/favicon.ico');

  // Scalable SVG icon
  const b64 = (await sharp('public/icons/icon-192.png').png().toBuffer()).toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <image href="data:image/png;base64,${b64}" x="0" y="0" width="192" height="192" />
</svg>\n`;
  fs.writeFileSync('public/icons/icon.svg', svgContent, 'utf8');
  console.log('Generated: public/icons/icon.svg');

  console.log('All brand assets successfully built with solid dark backgrounds!');
}

processLogo().catch((err) => {
  console.error('Error generating brand assets:', err);
  process.exit(1);
});
