import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

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

  // 1. Full logo (transparent)
  const fullW = boxRight - boxLeft;
  const fullH = boxBottom - boxTop;
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: boxLeft, top: boxTop, width: fullW, height: fullH })
    .png()
    .toFile('public/img/logo-full.png');
  console.log('Generated: public/img/logo-full.png');

  // 2. Icon Mark (transparent square)
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

  // 3. icon-512.png (512x512)
  await sharp('public/img/logo-mark.png')
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/icons/icon-512.png');
  console.log('Generated: public/icons/icon-512.png');

  // 4. icon-192.png (192x192)
  await sharp('public/img/logo-mark.png')
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/icons/icon-192.png');
  console.log('Generated: public/icons/icon-192.png');

  // 5. apple-touch-icon.png (180x180) - with sleek dark background
  await sharp('public/img/logo-mark.png')
    .resize(148, 148, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 16,
      bottom: 16,
      left: 16,
      right: 16,
      background: { r: 8, g: 12, b: 22, alpha: 1 },
    })
    .png()
    .toFile('public/icons/apple-touch-icon.png');
  console.log('Generated: public/icons/apple-touch-icon.png');

  // 6. favicon-32.png (32x32)
  await sharp('public/img/logo-mark.png')
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/icons/favicon-32.png');
  console.log('Generated: public/icons/favicon-32.png');

  // 7. public/favicon.ico
  await sharp('public/icons/favicon-32.png').toFile('public/favicon.ico');
  console.log('Generated: public/favicon.ico');

  // 8. public/icons/icon.svg
  const b64 = (await sharp('public/img/logo-mark.png').resize(128, 128).png().toBuffer()).toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <image href="data:image/png;base64,${b64}" x="0" y="0" width="128" height="128" />
</svg>\n`;
  fs.writeFileSync('public/icons/icon.svg', svgContent, 'utf8');
  console.log('Generated: public/icons/icon.svg');

  // 9. OpenGraph social share card
  await sharp(src)
    .resize(1200, 630, { fit: 'cover' })
    .png()
    .toFile('public/img/og-brand.png');
  console.log('Generated: public/img/og-brand.png');

  // 10. Also copy the original wallpaper to public/img/hero-logo-banner.webp
  await sharp(src)
    .webp({ quality: 90 })
    .toFile('public/img/hero-logo-banner.webp');
  console.log('Generated: public/img/hero-logo-banner.webp');

  console.log('All brand assets successfully built!');
}

processLogo().catch((err) => {
  console.error('Error generating brand assets:', err);
  process.exit(1);
});
