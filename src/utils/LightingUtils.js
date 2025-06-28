export function checkLightingCondition(
  videoElement,
  landmarks = null,
  threshold = 120,
  options = {}
) {
  if (!videoElement || videoElement.readyState < 2) {
    return { isBright: true, luminance: 0 };
  }

  const {
    sampleRate = 4,
    facePadding = 0.05, //  tighter padding (was 0.1)
    minFaceSize = 50,
  } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const scale = 0.5;
  canvas.width = videoElement.videoWidth * scale;
  canvas.height = videoElement.videoHeight * scale;

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  // console.log("total", landmarks.length);

  //  Don't analyze anything unless valid face area
  if (!landmarks || landmarks.length < 10) {
    return { isBright: false, luminance: 0 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  landmarks.forEach((landmark) => {
    const x = canvas.width - landmark.x * canvas.width; // mirrored X
    const y = landmark.y * canvas.height;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  const width = maxX - minX;
  const height = maxY - minY;

  if (width < minFaceSize || height < minFaceSize) {
    return { isBright: false, luminance: 0 };
  }

  const padX = width * facePadding;
  const padY = height * facePadding;

  const sampleArea = {
    x: Math.max(0, minX - padX),
    y: Math.max(0, minY - padY),
    width: Math.min(canvas.width - minX, width + 2 * padX),
    height: Math.min(canvas.height - minY, height + 2 * padY)
  };

  const imageData = ctx.getImageData(
    sampleArea.x, sampleArea.y,
    sampleArea.width, sampleArea.height
  ).data;

  let luminanceTotal = 0;
  let pixelCount = 0;

  for (let i = 0; i < imageData.length; i += 4 * sampleRate) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    luminanceTotal += 0.299 * r + 0.587 * g + 0.114 * b;
    pixelCount++;
  }

  const avgLuminance = luminanceTotal / (pixelCount || 1);
  const isBright = avgLuminance > threshold;

  return { isBright, luminance: Math.round(avgLuminance) };
}
