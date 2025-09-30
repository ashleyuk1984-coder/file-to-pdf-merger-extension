/**
 * Simple icon generator for the extension
 * Creates basic placeholder icons in purple theme
 */

const fs = require('fs');
const path = require('path');

function createSVGIcon(size) {
    const cornerRadius = Math.round(size * 0.15);
    const iconSize = Math.round(size * 0.6);
    const x = Math.round((size - iconSize) / 2);
    const y = Math.round((size - iconSize) / 2);
    const cornerSize = Math.round(iconSize * 0.2);
    const lineHeight = Math.max(1, Math.round(size * 0.04));
    const lineY = y + Math.round(iconSize * 0.3);
    const lineWidth = Math.round(iconSize * 0.6);
    const lineX = x + Math.round(iconSize * 0.15);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#9333ea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="url(#bgGradient)" />
  
  <!-- Document body -->
  <rect x="${x}" y="${y}" width="${iconSize}" height="${Math.round(iconSize * 0.8)}" fill="white" />
  
  <!-- Folded corner -->
  <polygon points="${x + iconSize - cornerSize},${y} ${x + iconSize},${y + cornerSize} ${x + iconSize - cornerSize},${y + cornerSize}" fill="#f1f5f9" />
  
  <!-- Text lines -->
  <rect x="${lineX}" y="${lineY}" width="${lineWidth}" height="${lineHeight}" fill="#64748b" />
  <rect x="${lineX}" y="${lineY + Math.round(lineHeight * 1.5)}" width="${lineWidth}" height="${lineHeight}" fill="#64748b" />
  <rect x="${lineX}" y="${lineY + Math.round(lineHeight * 3)}" width="${lineWidth}" height="${lineHeight}" fill="#64748b" />
</svg>`;
}

async function generateIcons() {
    const sizes = [16, 32, 48, 128];
    const iconsDir = path.join(__dirname, 'icons');
    
    // Ensure icons directory exists
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir);
    }
    
    for (const size of sizes) {
        const svgContent = createSVGIcon(size);
        const svgPath = path.join(iconsDir, `icon-${size}.svg`);
        
        fs.writeFileSync(svgPath, svgContent);
        console.log(`Generated icon-${size}.svg`);
    }
    
    console.log('\\nAll icons generated!');
    console.log('Note: These are SVG files. For production, convert to PNG using an online converter or image editor.');
    console.log('For now, update the manifest.json to use .svg files instead of .png');
}

generateIcons().catch(console.error);