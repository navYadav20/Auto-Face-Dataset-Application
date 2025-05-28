export function checkLightingConditions(imageData) {
  const { data, width, height } = imageData;
  
  //  Calculate average brightness (0-255)
  let brightnessSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    brightnessSum += (data[i] + data[i+1] + data[i+2]) / 3;
  }
  const avgBrightness = (brightnessSum / (data.length / 4)) / 2.55; // Convert to %

  // Check background whiteness (center 20% of frame)
  const centerX = width * 0.4;
  const centerY = height * 0.4;
  const centerWidth = width * 0.2;
  const centerHeight = height * 0.2;
  
  let whitePixels = 0;
  for (let y = centerY; y < centerY + centerHeight; y++) {
    for (let x = centerX; x < centerX + centerWidth; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      if (r > 220 && g > 220 && b > 220) whitePixels++;
    }
  }
  const whitePercentage = (whitePixels / (centerWidth * centerHeight)) * 100;

  //  Face illumination check (contrast ratio)
  const faceCenter = { x: width/2, y: height/2 };
  const faceRadius = Math.min(width, height) * 0.2;
  
  let faceBrightness = 0;
  for (let y = faceCenter.y - faceRadius; y < faceCenter.y + faceRadius; y++) {
    for (let x = faceCenter.x - faceRadius; x < faceCenter.x + faceRadius; x++) {
      if (y >=0 && x >=0 && y < height && x < width) {
        const idx = (y * width + x) * 4;
        faceBrightness += (data[idx] + data[idx+1] + data[idx+2]) / 3;
      }
    }
  }
  faceBrightness = faceBrightness / (Math.PI * faceRadius * faceRadius);

  return {
    passed: avgBrightness > 20 && whitePercentage >= 0 && faceBrightness > 50,
    details: {
      brightness: Math.round(avgBrightness),
      backgroundWhiteness: Math.round(whitePercentage),
      faceIllumination: Math.round(faceBrightness)
    }
  };
}