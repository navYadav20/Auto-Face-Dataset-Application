export function checkBackgroundIsWhite(videoElement, threshold = 220) {
  if (!videoElement) return false;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const width = canvas.width;
  const height = canvas.height;

  // Sample regions: top, left, right borders
  const margin = 10; // pixels to skip from edge
  const sampleSize = 20;
  const samples = [];

  for (let y = margin; y < margin + sampleSize; y++) {
    for (let x = margin; x < margin + sampleSize; x++) {
      const index = (y * width + x) * 4;
      samples.push([frame[index], frame[index + 1], frame[index + 2]]);
    }
    for (let x = width - margin - sampleSize; x < width - margin; x++) {
      const index = (y * width + x) * 4;
      samples.push([frame[index], frame[index + 1], frame[index + 2]]);
    }
  }

  // Compute average R, G, B
  let totalR = 0, totalG = 0, totalB = 0;
  samples.forEach(([r, g, b]) => {
    totalR += r;
    totalG += g;
    totalB += b;
  });

  const avgR = totalR / samples.length;
  const avgG = totalG / samples.length;
  const avgB = totalB / samples.length;

  const isWhiteEnough = avgR >= threshold && avgG >= threshold && avgB >= threshold;
  console.log("bg white " + isWhiteEnough);
  return isWhiteEnough;
}