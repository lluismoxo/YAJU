// Native ASCII renderer for the Labs globe. Scene integration is kept separate.
// Preserve the original sampling order and arithmetic: both affect glyph placement.
const characters = " .:,'-^=*+?!|0#X%WM@";

export function globeMetrics(width, height, cellSize = 7, fontSize = 10) {
  const shortestSide = Math.min(width, height);
  const scale = shortestSide / 1000;
  return {
    cellSize: Math.max(cellSize * scale, 3),
    fontSize: Math.max(fontSize * scale, 6),
    altitude: shortestSide < 500 ? 1.8 : shortestSide < 768 ? 1.6 : shortestSide < 1024 ? 1.4 : 1.3,
  };
}

export function globeReveal(elapsedMilliseconds) {
  return 1 - Math.pow(1 - Math.min(Math.max(elapsedMilliseconds, 0) / 2500, 1), 3);
}

export function drawGlobeAscii(context, pixels, width, height, {
  cellSize, fontSize, reveal = 1, color = '#ffffff',
  brightness = 0.7, contrast = 1.05, characterSpacing = 1.05,
}) {
  if (width <= 0 || height <= 0 || cellSize <= 0 || characterSpacing <= 0) return;
  context.clearRect(0, 0, width, height);
  const expansion = 1 + 3 * (1 - reveal);
  context.globalAlpha = reveal;
  context.font = `${fontSize}px monospace`;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const step = cellSize * characterSpacing * expansion * 0.8;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const sampleX = Math.min(x + step / 2, width - 1);
      const sampleY = Math.min(y + step / 2, height - 1);
      const offset = (Math.floor(sampleY) * width + Math.floor(sampleX)) * 4;
      let luminance = (0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2]) / 255;
      luminance = 1.1 * brightness * Math.pow(luminance, 0.7);
      luminance = Math.max(0, Math.min(1, (luminance - 0.5) * (1.4 * contrast) + 0.5));
      const glyph = characters[Math.floor(luminance * (characters.length - 1))];
      context.fillText(glyph, x + step / 2, y + step / 2);
    }
  }
  context.globalAlpha = 1;
}
