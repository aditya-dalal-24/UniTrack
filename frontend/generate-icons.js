import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputImagePath = path.join(process.cwd(), 'public', 'unitrack-logo.png');
const outputDir = path.join(process.cwd(), 'public', 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    // 192x192
    await sharp(inputImagePath)
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(outputDir, 'icon-192x192.png'));
    
    // 512x512
    await sharp(inputImagePath)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(outputDir, 'icon-512x512.png'));

    // 512x512 Maskable (with solid background)
    await sharp(inputImagePath)
      .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 56,
        bottom: 56,
        left: 56,
        right: 56,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for maskable
      })
      .toFile(path.join(outputDir, 'icon-maskable-512x512.png'));
      
    console.log('Icons generated successfully.');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
