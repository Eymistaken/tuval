/** Rounded glass bends the backdrop only in a narrow band along its edge. */
export function createLensMap(width, height, radius, padding = 12) {
  const imageWidth = width + padding * 2;
  const imageHeight = height + padding * 2;
  const pixels = new Uint8ClampedArray(imageWidth * imageHeight * 4);
  const corner = Math.min(radius, width / 2, height / 2);
  const band = Math.min(18, Math.min(width, height) * 0.3);
  for (let y = 0; y < imageHeight; y += 1) {
    for (let x = 0; x < imageWidth; x += 1) {
      const px = x - padding + 0.5 - width / 2;
      const py = y - padding + 0.5 - height / 2;
      const qx = Math.abs(px) - (width / 2 - corner);
      const qy = Math.abs(py) - (height / 2 - corner);
      const outsideX = Math.max(qx, 0);
      const outsideY = Math.max(qy, 0);
      const length = Math.hypot(outsideX, outsideY);
      const depth = corner - length - Math.min(Math.max(qx, qy), 0);
      let dx = 0;
      let dy = 0;
      if (depth > 0 && depth < band) {
        // Keep the profile's slope below one so the edge bends without folding the image.
        const strength = Math.sin(Math.PI * depth / band) * band / 24 * 0.28;
        if (qx > 0 && qy > 0) {
          dx = -Math.sign(px) * outsideX / length * strength;
          dy = -Math.sign(py) * outsideY / length * strength;
        } else if (qx > qy) dx = -Math.sign(px) * strength;
        else dy = -Math.sign(py) * strength;
      }
      const index = (y * imageWidth + x) * 4;
      pixels[index] = (0.5 + dx) * 255;
      pixels[index + 1] = (0.5 + dy) * 255;
      pixels[index + 2] = 128;
      pixels[index + 3] = 255;
    }
  }
  return { width: imageWidth, height: imageHeight, pixels };
}
